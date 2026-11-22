using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class OrganizationAuthorizationService : IOrganizationAuthorizationService
{
    private readonly ApplicationDbContext _context;

    public OrganizationAuthorizationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> HasActiveApprovedMembershipAsync(
        int userId,
        int organizationId)
    {
        return await _context.OrganizationMemberships
            .AsNoTracking()
            .AnyAsync(m =>
                m.UserId == userId &&
                m.OrganizationId == organizationId &&
                m.MembershipStatus == "Approved" &&
                m.User.IsActive &&
                m.Organization.IsActive);
    }

    public async Task<bool> HasOrganizationPermissionAsync(
        int userId,
        int organizationId,
        string permissionName)
    {
        if (string.IsNullOrWhiteSpace(permissionName))
        {
            return false;
        }

        return await _context.OrganizationMemberships
            .AsNoTracking()
            .AnyAsync(m =>
                m.UserId == userId &&
                m.OrganizationId == organizationId &&
                m.MembershipStatus == "Approved" &&
                m.User.IsActive &&
                m.Organization.IsActive &&
                m.MembershipRoles.Any(mr =>
                    mr.OrganizationId == organizationId &&
                    mr.Role.OrganizationId == organizationId &&
                    !mr.Role.IsSystemDefined &&
                    mr.Role.RolePermissions.Any(rp =>
                        rp.Permission.PermissionName == permissionName)));
    }
}
