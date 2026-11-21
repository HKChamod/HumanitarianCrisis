using System.Security.Claims;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.API.Authorization;

public class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    private readonly ApplicationDbContext _context;

    public PermissionAuthorizationHandler(
        ApplicationDbContext context)
    {
        _context = context;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        var userRoles = context.User
            .FindAll(ClaimTypes.Role)
            .Select(claim => claim.Value)
            .Distinct()
            .ToArray();

        if (userRoles.Length == 0)
        {
            return;
        }

        var hasPermission = await _context.RolePermissions
            .AsNoTracking()
            .AnyAsync(rp =>
                userRoles.Contains(rp.Role.RoleName) &&
                (rp.Permission.PermissionName == requirement.PermissionName ||
                 (requirement.PermissionName == "Inventory.View" && (rp.Permission.PermissionName == "Warehouses.View" || rp.Permission.PermissionName == "Resources.View")) ||
                 (requirement.PermissionName == "Inventory.Manage" && (rp.Permission.PermissionName == "Warehouses.Manage" || rp.Permission.PermissionName == "Resources.Manage"))));

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}
