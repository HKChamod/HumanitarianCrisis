using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Users;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserManagementService _userService;

    public UsersController(IUserManagementService userService)
    {
        _userService = userService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var userId))
            throw new UnauthorizedAccessException("Invalid user identity.");
        return userId;
    }

    [HttpGet]
    [Authorize(Policy = "Users.View")]
    [ProducesResponseType(typeof(IReadOnlyList<UserAdminResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search = null,
        [FromQuery] bool? isActive = null)
    {
        return Ok(await _userService.GetAllAsync(search, isActive));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "Users.View")]
    [ProducesResponseType(typeof(UserAdminResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(int id)
    {
        return Ok(await _userService.GetByIdAsync(id));
    }

    [HttpPost]
    [Authorize(Policy = "Users.Manage")]
    [ProducesResponseType(typeof(UserAdminResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateUserAdminRequest request)
    {
        var created = await _userService.CreateAsync(request, GetCurrentUserId());
        return CreatedAtAction(nameof(GetById), new { id = created.UserId }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Users.Manage")]
    [ProducesResponseType(typeof(UserAdminResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserAdminRequest request)
    {
        return Ok(await _userService.UpdateAsync(id, request, GetCurrentUserId()));
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "Users.Manage")]
    [ProducesResponseType(typeof(UserAdminResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> SetStatus(int id, [FromQuery] bool isActive)
    {
        return Ok(await _userService.SetActiveStatusAsync(id, isActive, GetCurrentUserId()));
    }

    [HttpPut("{id:int}/roles")]
    [Authorize(Policy = "Users.Manage")]
    [ProducesResponseType(typeof(UserAdminResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateRoles(int id, [FromBody] UpdateUserRolesRequest request)
    {
        return Ok(await _userService.UpdateRolesAsync(id, request, GetCurrentUserId()));
    }
}
