using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class OrganizationMembershipService : IOrganizationMembershipService
{
    private static readonly HashSet<string> GlobalOnlySystemPermissions = new(StringComparer.OrdinalIgnoreCase)
    {
        "Users.View",
        "Users.Manage",
        "Roles.Manage",
        "Permissions.View",
        "AuditLogs.View"
    };

    private static readonly string[] DefaultOrganizationAdminPermissions =
    [
        "Organizations.View",
        "Organizations.Manage",
        "Organizations.ApproveMembers",
        "Resources.View",
        "Resources.Manage",
        "Resources.Allocate",
        "Reports.View"
    ];

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService? _auditLogService;

    public OrganizationMembershipService(
        ApplicationDbContext context,
        IAuditLogService? auditLogService = null)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<OrganizationMembershipResponse> RequestMembershipAsync(
        int organizationId,
        int userId)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId);

        if (organization == null)
            throw new KeyNotFoundException("Organization not found.");

        if (!organization.IsActive)
            throw new InvalidOperationException(
                "Cannot request membership in an inactive organization.");

        var existingMembership = await _context.OrganizationMemberships
            .AnyAsync(m =>
                m.OrganizationId == organizationId &&
                m.UserId == userId);

        if (existingMembership)
            throw new InvalidOperationException(
                "You already have a membership or pending request for this organization.");

        var membership = new OrganizationMembership
        {
            UserId = userId,
            OrganizationId = organizationId,
            MembershipStatus = "Pending",
            JoinedAt = DateTime.UtcNow
        };

        _context.OrganizationMemberships.Add(membership);

        await _context.SaveChangesAsync();

        return new OrganizationMembershipResponse
        {
            MembershipId = membership.MembershipId,
            UserId = membership.UserId,
            OrganizationId = membership.OrganizationId,
            OrganizationName = organization.OrganizationName,
            MembershipStatus = membership.MembershipStatus,
            JoinedAt = membership.JoinedAt,
            ApprovedAt = membership.ApprovedAt,
            ApprovedByUserId = membership.ApprovedByUserId
        };
    }

    public async Task<OrganizationMembershipResponse> AddMemberAsync(
        int organizationId,
        AddOrganizationMemberRequest request)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId);

        if (organization == null)
            throw new KeyNotFoundException("Organization not found.");

        if (!organization.IsActive)
            throw new InvalidOperationException(
                "Cannot add members to an inactive organization.");

        User? targetUser = null;
        if (request.UserId.HasValue)
        {
            targetUser = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == request.UserId.Value);
        }
        else if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalizedEmail = request.Email.Trim().ToLowerInvariant();
            targetUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        }
        else
        {
            throw new ArgumentException("Either UserId or Email must be provided.");
        }

        if (targetUser == null)
            throw new KeyNotFoundException("Target user account was not found.");

        if (!targetUser.IsActive)
            throw new InvalidOperationException("Cannot add an inactive user to an organization.");

        var existingMembership = await _context.OrganizationMemberships
            .AnyAsync(m =>
                m.OrganizationId == organizationId &&
                m.UserId == targetUser.UserId);

        if (existingMembership)
            throw new InvalidOperationException(
                "This user already has a membership or pending request for this organization.");

        var membership = new OrganizationMembership
        {
            UserId = targetUser.UserId,
            OrganizationId = organizationId,
            MembershipStatus = "Pending",
            JoinedAt = DateTime.UtcNow
        };

        _context.OrganizationMemberships.Add(membership);
        await _context.SaveChangesAsync();

        return new OrganizationMembershipResponse
        {
            MembershipId = membership.MembershipId,
            UserId = membership.UserId,
            OrganizationId = membership.OrganizationId,
            OrganizationName = organization.OrganizationName,
            MembershipStatus = membership.MembershipStatus,
            JoinedAt = membership.JoinedAt,
            ApprovedAt = membership.ApprovedAt,
            ApprovedByUserId = membership.ApprovedByUserId
        };
    }

    public async Task<IReadOnlyList<OrganizationRoleResponse>> GetOrganizationRolesAsync(
        int organizationId)
    {
        var orgExists = await _context.Organizations
            .AnyAsync(o => o.OrganizationId == organizationId);

        if (!orgExists)
            throw new KeyNotFoundException("Organization not found.");

        var roles = await _context.Roles
            .AsNoTracking()
            .Where(r => r.OrganizationId == organizationId && !r.IsSystemDefined)
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .OrderBy(r => r.RoleName)
            .ToListAsync();

        return roles.Select(MapOrganizationRole).ToList();
    }

    public async Task<OrganizationRoleResponse> CreateOrganizationRoleAsync(
        int organizationId,
        CreateOrganizationRoleRequest request,
        int createdByUserId)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId);

        if (organization == null)
            throw new KeyNotFoundException("Organization not found.");

        if (!organization.IsActive)
            throw new InvalidOperationException(
                "Cannot create roles for an inactive organization.");

        var roleName = request.RoleName.Trim();
        if (string.IsNullOrWhiteSpace(roleName))
            throw new ArgumentException("Role name is required.");

        if (string.Equals(roleName, "Administrator", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException(
                "Global system role name 'Administrator' cannot be used as an organization role.");

        var duplicateRole = await _context.Roles
            .AnyAsync(r =>
                r.OrganizationId == organizationId &&
                r.RoleName.ToLower() == roleName.ToLower());

        if (duplicateRole)
            throw new InvalidOperationException(
                $"Role '{roleName}' already exists for this organization.");

        List<Permission> permissions;
        if (request.PermissionIds != null && request.PermissionIds.Count > 0)
        {
            var distinctIds = request.PermissionIds.Distinct().ToList();
            permissions = await _context.Permissions
                .Where(p => distinctIds.Contains(p.PermissionId))
                .ToListAsync();

            if (permissions.Count != distinctIds.Count)
                throw new ArgumentException("One or more specified permissions do not exist.");
        }
        else if (string.Equals(roleName, "OrganizationAdmin", StringComparison.OrdinalIgnoreCase))
        {
            permissions = await _context.Permissions
                .Where(p => DefaultOrganizationAdminPermissions.Contains(p.PermissionName))
                .ToListAsync();
        }
        else
        {
            throw new ArgumentException("At least one valid permission must be specified.");
        }

        var disallowed = permissions
            .Where(p => GlobalOnlySystemPermissions.Contains(p.PermissionName))
            .Select(p => p.PermissionName)
            .ToList();

        if (disallowed.Count > 0)
            throw new InvalidOperationException(
                $"Global system permissions cannot be assigned to organization-scoped roles: {string.Join(", ", disallowed)}.");

        var role = new Role
        {
            RoleName = roleName,
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? $"Organization-scoped role for {organization.OrganizationName}"
                : request.Description.Trim(),
            OrganizationId = organizationId,
            IsSystemDefined = false
        };

        foreach (var permission in permissions)
        {
            role.RolePermissions.Add(new RolePermission
            {
                Role = role,
                PermissionId = permission.PermissionId,
                Permission = permission
            });
        }

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.RecordAsync(
                createdByUserId,
                null,
                "Organization.RoleCreated",
                "Role",
                role.RoleId.ToString(),
                $"Created organization role '{role.RoleName}' for organization #{organizationId} with {permissions.Count} permission(s).");
        }

        return MapOrganizationRole(role);
    }

    private static OrganizationRoleResponse MapOrganizationRole(Role role) => new()
    {
        RoleId = role.RoleId,
        OrganizationId = role.OrganizationId ?? 0,
        RoleName = role.RoleName,
        Description = role.Description,
        IsSystemDefined = role.IsSystemDefined,
        Permissions = role.RolePermissions
            .Select(rp => new OrganizationRolePermissionItem
            {
                PermissionId = rp.Permission.PermissionId,
                PermissionName = rp.Permission.PermissionName,
                Description = rp.Permission.Description
            })
            .OrderBy(p => p.PermissionName)
            .ToList()
    };

    public async Task<IReadOnlyList<OrganizationMemberResponse>> GetMembersAsync(
    int organizationId)
    {
        var organizationExists = await _context.Organizations
            .AnyAsync(o => o.OrganizationId == organizationId);

        if (!organizationExists)
            throw new KeyNotFoundException("Organization not found.");

        var members = await _context.OrganizationMemberships
            .AsNoTracking()
            .Where(m => m.OrganizationId == organizationId)
            .Include(m => m.User)
            .Include(m => m.MembershipRoles)
                .ThenInclude(mr => mr.Role)
            .OrderByDescending(m => m.JoinedAt)
            .ToListAsync();

        return members.Select(m => new OrganizationMemberResponse
        {
            MembershipId = m.MembershipId,
            UserId = m.UserId,
            FullName = m.User.FullName,
            Email = m.User.Email,
            MembershipStatus = m.MembershipStatus,
            JoinedAt = m.JoinedAt,
            ApprovedAt = m.ApprovedAt,
            ApprovedByUserId = m.ApprovedByUserId,
            Roles = m.MembershipRoles
                .Where(mr =>
                    mr.OrganizationId == organizationId &&
                    mr.Role.OrganizationId == organizationId &&
                    !mr.Role.IsSystemDefined)
                .Select(mr => mr.Role.RoleName)
                .Distinct(StringComparer.Ordinal)
                .OrderBy(r => r, StringComparer.Ordinal)
                .ToList()
        }).ToList();
    }

    public async Task<OrganizationMembershipResponse> ApproveMembershipAsync(
        int organizationId,
        int membershipId,
        int approvedByUserId)
    {
        var membership = await _context.OrganizationMemberships
            .Include(m => m.Organization)
            .Include(m => m.User)
            .FirstOrDefaultAsync(m =>
                m.MembershipId == membershipId &&
                m.OrganizationId == organizationId);

        if (membership == null)
            throw new KeyNotFoundException("Membership not found.");

        if (!membership.Organization.IsActive)
            throw new InvalidOperationException(
                "Cannot approve membership for an inactive organization.");

        if (!membership.User.IsActive)
            throw new InvalidOperationException(
                "Cannot approve membership for an inactive user.");

        if (membership.MembershipStatus != "Pending")
            throw new InvalidOperationException(
                "Only pending membership requests can be approved.");

        membership.MembershipStatus = "Approved";
        membership.ApprovedAt = DateTime.UtcNow;
        membership.ApprovedByUserId = approvedByUserId;

        await _context.SaveChangesAsync();

        return new OrganizationMembershipResponse
        {
            MembershipId = membership.MembershipId,
            UserId = membership.UserId,
            OrganizationId = membership.OrganizationId,
            OrganizationName = membership.Organization.OrganizationName,
            MembershipStatus = membership.MembershipStatus,
            JoinedAt = membership.JoinedAt,
            ApprovedAt = membership.ApprovedAt,
            ApprovedByUserId = membership.ApprovedByUserId
        };
    }
    public async Task<OrganizationMembershipResponse> RejectMembershipAsync(
    int organizationId,
    int membershipId)
    {
        var membership = await _context.OrganizationMemberships
            .Include(m => m.Organization)
            .FirstOrDefaultAsync(m =>
                m.MembershipId == membershipId &&
                m.OrganizationId == organizationId);

        if (membership == null)
            throw new KeyNotFoundException("Membership not found.");

        if (!membership.Organization.IsActive)
            throw new InvalidOperationException(
                "Cannot reject membership for an inactive organization.");

        if (membership.MembershipStatus != "Pending")
            throw new InvalidOperationException(
                "Only pending membership requests can be rejected.");

        membership.MembershipStatus = "Rejected";

        await _context.SaveChangesAsync();

        return new OrganizationMembershipResponse
        {
            MembershipId = membership.MembershipId,
            UserId = membership.UserId,
            OrganizationId = membership.OrganizationId,
            OrganizationName = membership.Organization.OrganizationName,
            MembershipStatus = membership.MembershipStatus,
            JoinedAt = membership.JoinedAt,
            ApprovedAt = membership.ApprovedAt,
            ApprovedByUserId = membership.ApprovedByUserId
        };
    }

    public async Task<OrganizationMemberResponse> AssignRolesAsync(
    int organizationId,
    int membershipId,
    AssignOrganizationRolesRequest request,
    int assignedByUserId)
    {
        var membership = await _context.OrganizationMemberships
            .Include(m => m.Organization)
            .Include(m => m.User)
            .Include(m => m.MembershipRoles)
                .ThenInclude(mr => mr.Role)
            .FirstOrDefaultAsync(m =>
                m.MembershipId == membershipId &&
                m.OrganizationId == organizationId);

        if (membership == null)
            throw new KeyNotFoundException("Membership not found.");

        if (!membership.Organization.IsActive)
            throw new InvalidOperationException(
                "Cannot assign roles in an inactive organization.");

        if (!membership.User.IsActive)
            throw new InvalidOperationException(
                "Cannot assign roles to an inactive user.");

        if (membership.MembershipStatus != "Approved")
            throw new InvalidOperationException(
                "Roles can only be assigned to approved members.");

        if (request.RoleIds == null || request.RoleIds.Count == 0)
            throw new InvalidOperationException(
                "At least one role must be provided.");

        if (request.RoleIds.Distinct().Count() != request.RoleIds.Count)
            throw new InvalidOperationException(
                "Duplicate role IDs are not allowed.");

        var roles = await _context.Roles
            .Where(r =>
                request.RoleIds.Contains(r.RoleId) &&
                r.OrganizationId == organizationId &&
                !r.IsSystemDefined)
            .ToListAsync();

        if (roles.Count != request.RoleIds.Count)
            throw new InvalidOperationException(
                "One or more roles are invalid or do not belong to this organization.");

        var existingRoleIds = membership.MembershipRoles
            .Select(mr => mr.RoleId)
            .ToHashSet();

        var newRoles = roles
            .Where(r => !existingRoleIds.Contains(r.RoleId))
            .ToList();

        foreach (var role in newRoles)
        {
            membership.MembershipRoles.Add(new OrganizationMembershipRole
            {
                MembershipId = membership.MembershipId,
                OrganizationId = organizationId,
                RoleId = role.RoleId,
                AssignedAt = DateTime.UtcNow,
                AssignedByUserId = assignedByUserId,
                Role = role
            });
        }

        await _context.SaveChangesAsync();

        return new OrganizationMemberResponse
        {
            MembershipId = membership.MembershipId,
            UserId = membership.UserId,
            FullName = membership.User.FullName,
            Email = membership.User.Email,
            MembershipStatus = membership.MembershipStatus,
            JoinedAt = membership.JoinedAt,
            ApprovedAt = membership.ApprovedAt,
            ApprovedByUserId = membership.ApprovedByUserId,
            Roles = membership.MembershipRoles
                .Where(mr =>
                    mr.OrganizationId == organizationId &&
                    mr.Role.OrganizationId == organizationId &&
                    !mr.Role.IsSystemDefined)
                .Select(mr => mr.Role.RoleName)
                .Distinct(StringComparer.Ordinal)
                .OrderBy(r => r, StringComparer.Ordinal)
                .ToList()
        };
    }

    public async Task<IReadOnlyList<MyOrganizationMembershipResponse>> GetMyMembershipsAsync(
        int userId)
    {
        var memberships = await _context.OrganizationMemberships
            .AsNoTracking()
            .Where(m => m.UserId == userId && m.User.IsActive)
            .OrderByDescending(m => m.JoinedAt)
            .Select(m => new
            {
                m.MembershipId,
                m.OrganizationId,
                OrganizationName = m.Organization.OrganizationName,
                RegistrationNumber = m.Organization.RegistrationNumber,
                IsOrganizationActive = m.Organization.IsActive,
                m.MembershipStatus,
                m.JoinedAt,
                m.ApprovedAt,
                Roles = m.MembershipRoles
                    .Where(mr =>
                        mr.OrganizationId == m.OrganizationId &&
                        mr.Role.OrganizationId == m.OrganizationId &&
                        !mr.Role.IsSystemDefined)
                    .Select(mr => mr.Role.RoleName)
                    .ToList()
            })
            .ToListAsync();

        return memberships.Select(m => new MyOrganizationMembershipResponse
        {
            MembershipId = m.MembershipId,
            OrganizationId = m.OrganizationId,
            OrganizationName = m.OrganizationName,
            RegistrationNumber = m.RegistrationNumber,
            IsOrganizationActive = m.IsOrganizationActive,
            MembershipStatus = m.MembershipStatus,
            JoinedAt = m.JoinedAt,
            ApprovedAt = m.ApprovedAt,
            Roles = m.Roles
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Distinct(StringComparer.Ordinal)
                .OrderBy(r => r, StringComparer.Ordinal)
                .ToList()
        }).ToList();
    }

    public async Task<MyOrganizationAccessResponse?> GetMyOrganizationAccessAsync(
        int organizationId,
        int userId)
    {
        var access = await _context.OrganizationMemberships
            .AsNoTracking()
            .Where(m =>
                m.OrganizationId == organizationId &&
                m.UserId == userId &&
                m.MembershipStatus == "Approved" &&
                m.User.IsActive &&
                m.Organization.IsActive)
            .Select(m => new
            {
                m.OrganizationId,
                OrganizationName = m.Organization.OrganizationName,
                m.MembershipId,
                m.MembershipStatus,
                Roles = m.MembershipRoles
                    .Where(mr =>
                        mr.OrganizationId == organizationId &&
                        mr.Role.OrganizationId == organizationId &&
                        !mr.Role.IsSystemDefined)
                    .Select(mr => mr.Role.RoleName)
                    .ToList(),
                Permissions = m.MembershipRoles
                    .Where(mr =>
                        mr.OrganizationId == organizationId &&
                        mr.Role.OrganizationId == organizationId &&
                        !mr.Role.IsSystemDefined)
                    .SelectMany(mr => mr.Role.RolePermissions)
                    .Select(rp => rp.Permission.PermissionName)
                    .ToList()
            })
            .FirstOrDefaultAsync();

        if (access == null)
        {
            return null;
        }

        return new MyOrganizationAccessResponse
        {
            OrganizationId = access.OrganizationId,
            OrganizationName = access.OrganizationName,
            MembershipId = access.MembershipId,
            MembershipStatus = access.MembershipStatus,
            Roles = access.Roles
                .Where(r => !string.IsNullOrWhiteSpace(r))
                .Distinct(StringComparer.Ordinal)
                .OrderBy(r => r, StringComparer.Ordinal)
                .ToList(),
            Permissions = access.Permissions
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Distinct(StringComparer.Ordinal)
                .OrderBy(p => p, StringComparer.Ordinal)
                .ToList()
        };
    }

}