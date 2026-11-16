
using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ApplicationDbContext _context;

    public AuthController(
        IAuthService authService,
        ApplicationDbContext context)
    {
        _authService = authService;
        _context = context;
    }

    // POST: api/auth/register
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register(
        [FromBody] RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);

            return StatusCode(
                StatusCodes.Status201Created,
                response);
        }
        catch (InvalidOperationException ex)
            when (ex.Message == "An account with this email already exists.")
        {
            return Conflict(new
            {
                message = "An account with this email already exists."
            });
        }
    }


    // POST: api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(AuthResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);

        return Ok(response);
    }



    // GET: api/auth/me
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userIdClaim = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new
            {
                message = "Invalid authentication token."
            });
        }

        var user = await _context.Users
            .AsNoTracking()
            .Include(u => u.UserRoles)
                .ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.UserId == userId);

        if (user == null || !user.IsActive)
        {
            return Unauthorized(new
            {
                message = "User account is unavailable."
            });
        }

        return Ok(new
        {
            user.UserId,
            user.FullName,
            user.Email,
            user.PhoneNumber,
            user.CreatedAt,
            Roles = user.UserRoles
                .Select(ur => ur.Role.RoleName)
                .ToList()
        });
    }
}
