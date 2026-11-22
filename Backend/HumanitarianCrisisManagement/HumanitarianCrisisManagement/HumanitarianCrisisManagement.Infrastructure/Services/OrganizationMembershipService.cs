using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class OrganizationMembershipService : IOrganizationMembershipService
{
    private readonly ApplicationDbContext _context;

    public OrganizationMembershipService(ApplicationDbContext context)
    {
        _context = context;
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
            .FirstOrDefaultAsync(m =>
                m.MembershipId == membershipId &&
                m.OrganizationId == organizationId);

        if (membership == null)
            throw new KeyNotFoundException("Membership not found.");

        if (!membership.Organization.IsActive)
            throw new InvalidOperationException(
                "Cannot approve membership for an inactive organization.");

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
            .Where(m => m.UserId == userId)
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