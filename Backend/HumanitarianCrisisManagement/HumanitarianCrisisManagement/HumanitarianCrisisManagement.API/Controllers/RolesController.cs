using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Users;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleManagementService _roleService;

    public RolesController(IRoleManagementService roleService)
    {
        _roleService = roleService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var userId))
            throw new UnauthorizedAccessException("Invalid user identity.");
        return userId;
    }

    [HttpGet]
    [Authorize(Policy = "Roles.Manage")]
    [ProducesResponseType(typeof(IReadOnlyList<RoleDetailResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllRoles()
    {
        return Ok(await _roleService.GetAllRolesAsync());
    }

    [HttpGet("permissions")]
    [Authorize(Policy = "Permissions.View")]
    [ProducesResponseType(typeof(IReadOnlyList<PermissionItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllPermissions()
    {
        return Ok(await _roleService.GetAllPermissionsAsync());
    }

    [HttpPut("{roleId:int}/permissions")]
    [Authorize(Policy = "Roles.Manage")]
    [ProducesResponseType(typeof(RoleDetailResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRolePermissions(
        int roleId,
        [FromBody] UpdateRolePermissionsRequest request)
    {
        return Ok(await _roleService.UpdateRolePermissionsAsync(roleId, request, GetCurrentUserId()));
    }
}
