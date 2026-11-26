using HumanitarianCrisisManagement.Application.DTOs.Users;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class UserManagementService : IUserManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly IAuditLogService _auditLogService;

    public UserManagementService(
        ApplicationDbContext context,
        IPasswordHasherService passwordHasher,
        IAuditLogService auditLogService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyList<UserAdminResponse>> GetAllAsync(string? search = null, bool? isActive = null)
    {
        var query = _context.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.OrganizationMemberships)
                .ThenInclude(m => m.Organization)
            .Include(u => u.OrganizationMemberships)
                .ThenInclude(m => m.MembershipRoles)
                    .ThenInclude(mr => mr.Role)
            .AsQueryable();

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(term) ||
                u.Email.ToLower().Contains(term));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        return users.Select(MapUser).ToList();
    }

    public async Task<UserAdminResponse> GetByIdAsync(int userId)
    {
        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .Include(u => u.OrganizationMemberships)
                .ThenInclude(m => m.Organization)
            .Include(u => u.OrganizationMemberships)
                .ThenInclude(m => m.MembershipRoles)
                    .ThenInclude(mr => mr.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
            throw new KeyNotFoundException("User not found.");

        return MapUser(user);
    }

    public async Task<UserAdminResponse> CreateAsync(CreateUserAdminRequest request, int actorUserId)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail);
        if (exists)
            throw new InvalidOperationException("A user with this email address already exists.");

        var requestedRoleIds = request.RoleIds.Distinct().ToList();
        if (requestedRoleIds.Count == 0)
        {
            var citizenRole = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == "Citizen");
            if (citizenRole != null)
                requestedRoleIds.Add(citizenRole.RoleId);
        }
        else
        {
            var validRoleCount = await _context.Roles.CountAsync(r => requestedRoleIds.Contains(r.RoleId));
            if (validRoleCount != requestedRoleIds.Count)
                throw new ArgumentException("One or more specified roles do not exist.");
        }

        var user = new User
        {
            FullName = request.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = request.PhoneNumber?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        foreach (var roleId in requestedRoleIds)
        {
            _context.UserRoles.Add(new UserRole
            {
                UserId = user.UserId,
                RoleId = roleId
            });
        }

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "User.Created",
            "User",
            user.UserId.ToString(),
            $"Created user account #{user.UserId} with {requestedRoleIds.Count} role(s).");

        return await GetByIdAsync(user.UserId);
    }

    public async Task<UserAdminResponse> UpdateAsync(int userId, UpdateUserAdminRequest request, int actorUserId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
            throw new KeyNotFoundException("User not found.");

        if (userId == actorUserId && !request.IsActive)
            throw new InvalidOperationException("You cannot deactivate your own account.");

        user.FullName = request.FullName.Trim();
        user.PhoneNumber = request.PhoneNumber?.Trim();
        user.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "User.Updated",
            "User",
            user.UserId.ToString(),
            $"Updated user account #{user.UserId} (IsActive={user.IsActive}).");

        return await GetByIdAsync(user.UserId);
    }

    public async Task<UserAdminResponse> SetActiveStatusAsync(int userId, bool isActive, int actorUserId)
    {
        if (userId == actorUserId && !isActive)
            throw new InvalidOperationException("You cannot deactivate your own account.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        if (user == null)
            throw new KeyNotFoundException("User not found.");

        if (!isActive)
        {
            var isAdmin = await _context.UserRoles
                .AnyAsync(ur => ur.UserId == userId && ur.Role.RoleName == "Administrator");
            if (isAdmin)
            {
                var otherActiveAdmins = await _context.UserRoles
                    .CountAsync(ur => ur.UserId != userId && ur.User.IsActive && ur.Role.RoleName == "Administrator");
                if (otherActiveAdmins == 0)
                    throw new InvalidOperationException("Cannot deactivate the last active Administrator account.");
            }
        }

        user.IsActive = isActive;
        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            isActive ? "User.Activated" : "User.Deactivated",
            "User",
            user.UserId.ToString(),
            $"{(isActive ? "Activated" : "Deactivated")} user account #{user.UserId}.");

        return await GetByIdAsync(user.UserId);
    }

    public async Task<UserAdminResponse> UpdateRolesAsync(int userId, UpdateUserRolesRequest request, int actorUserId)
    {
        // Security invariant: never allow users to grant themselves elevated privileges or modify their own roles.
        if (userId == actorUserId)
            throw new InvalidOperationException("Users cannot modify their own role assignments.");

        var user = await _context.Users
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null)
            throw new KeyNotFoundException("User not found.");

        var targetRoleIds = request.RoleIds.Distinct().ToList();
        if (targetRoleIds.Count == 0)
            throw new ArgumentException("A user must have at least one role assigned.");

        var targetRoles = await _context.Roles
            .Where(r => targetRoleIds.Contains(r.RoleId))
            .ToListAsync();

        if (targetRoles.Count != targetRoleIds.Count)
            throw new ArgumentException("One or more specified roles do not exist.");

        var wasAdmin = user.UserRoles.Any(ur => ur.Role.RoleName == "Administrator");
        var willBeAdmin = targetRoles.Any(r => r.RoleName == "Administrator");
        if (wasAdmin && !willBeAdmin)
        {
            var otherActiveAdmins = await _context.UserRoles
                .CountAsync(ur => ur.UserId != userId && ur.User.IsActive && ur.Role.RoleName == "Administrator");
            if (otherActiveAdmins == 0)
                throw new InvalidOperationException("Cannot remove Administrator role from the last active Administrator.");
        }

        _context.UserRoles.RemoveRange(user.UserRoles);
        foreach (var roleId in targetRoleIds)
        {
            _context.UserRoles.Add(new UserRole
            {
                UserId = userId,
                RoleId = roleId
            });
        }

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "User.RolesUpdated",
            "User",
            user.UserId.ToString(),
            $"Updated roles for user #{user.UserId} to [{string.Join(", ", targetRoles.Select(r => r.RoleName))}].");

        return await GetByIdAsync(userId);
    }

    private static UserAdminResponse MapUser(User u)
    {
        var approvedMemberships = u.OrganizationMemberships
            .Where(m => m.MembershipStatus == "Approved" && m.Organization != null && m.Organization.IsActive)
            .ToList();

        var organizations = approvedMemberships
            .Select(m => m.Organization.OrganizationName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToList();

        var organizationRoles = approvedMemberships
            .SelectMany(m => m.MembershipRoles
                .Where(mr =>
                    mr.OrganizationId == m.OrganizationId &&
                    mr.Role != null &&
                    mr.Role.OrganizationId == m.OrganizationId &&
                    !mr.Role.IsSystemDefined)
                .Select(mr => $"{mr.Role.RoleName} ({m.Organization.OrganizationName})"))
            .Distinct(StringComparer.Ordinal)
            .OrderBy(r => r, StringComparer.Ordinal)
            .ToList();

        return new UserAdminResponse
        {
            UserId = u.UserId,
            FullName = u.FullName,
            Email = u.Email,
            PhoneNumber = u.PhoneNumber,
            IsActive = u.IsActive,
            Department = organizations.Count > 0 ? string.Join(", ", organizations) : null,
            Organizations = organizations,
            Roles = u.UserRoles.Select(ur => ur.Role.RoleName).OrderBy(r => r).ToList(),
            OrganizationRoles = organizationRoles,
            CreatedAt = u.CreatedAt
        };
    }
}

public class RoleManagementService : IRoleManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public RoleManagementService(
        ApplicationDbContext context,
        IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<IReadOnlyList<RoleDetailResponse>> GetAllRolesAsync()
    {
        var roles = await _context.Roles
            .AsNoTracking()
            .Include(r => r.UserRoles)
            .Include(r => r.MembershipRoles)
                .ThenInclude(mr => mr.Membership)
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.RoleId)
            .ToListAsync();

        return roles.Select(MapRole).ToList();
    }

    public async Task<IReadOnlyList<PermissionItemResponse>> GetAllPermissionsAsync()
    {
        var permissions = await _context.Permissions
            .AsNoTracking()
            .OrderBy(p => p.PermissionName)
            .ToListAsync();

        return permissions.Select(p => new PermissionItemResponse
        {
            PermissionId = p.PermissionId,
            PermissionName = p.PermissionName,
            Description = p.Description
        }).ToList();
    }

    public async Task<RoleDetailResponse> UpdateRolePermissionsAsync(
        int roleId,
        UpdateRolePermissionsRequest request,
        int actorUserId)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.RoleId == roleId);

        if (role == null)
            throw new KeyNotFoundException("Role not found.");

        if (string.Equals(role.RoleName, "Administrator", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Administrator system role permissions cannot be stripped to prevent lockout.");

        var targetIds = request.PermissionIds.Distinct().ToList();
        var validCount = await _context.Permissions.CountAsync(p => targetIds.Contains(p.PermissionId));
        if (validCount != targetIds.Count)
            throw new ArgumentException("One or more specified permissions do not exist.");

        _context.RolePermissions.RemoveRange(role.RolePermissions);
        foreach (var pid in targetIds)
        {
            _context.RolePermissions.Add(new RolePermission
            {
                RoleId = roleId,
                PermissionId = pid
            });
        }

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Role.PermissionsUpdated",
            "Role",
            role.RoleId.ToString(),
            $"Updated permissions for role '{role.RoleName}' ({targetIds.Count} permission(s)).");

        var reloaded = await _context.Roles
            .AsNoTracking()
            .Include(r => r.UserRoles)
            .Include(r => r.MembershipRoles)
                .ThenInclude(mr => mr.Membership)
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstAsync(r => r.RoleId == roleId);

        return MapRole(reloaded);
    }

    private static RoleDetailResponse MapRole(Role r)
    {
        var distinctUserCount = r.UserRoles
            .Select(ur => ur.UserId)
            .Concat(r.MembershipRoles
                .Where(mr => mr.Membership != null && mr.Membership.MembershipStatus == "Approved")
                .Select(mr => mr.Membership.UserId))
            .Distinct()
            .Count();

        return new RoleDetailResponse
        {
            RoleId = r.RoleId,
            RoleName = r.RoleName,
            Description = r.Description,
            UserCount = distinctUserCount,
            Permissions = r.RolePermissions
                .Select(rp => new PermissionItemResponse
                {
                    PermissionId = rp.Permission.PermissionId,
                    PermissionName = rp.Permission.PermissionName,
                    Description = rp.Permission.Description
                })
                .OrderBy(p => p.PermissionName)
                .ToList()
        };
    }
}
