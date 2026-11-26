using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.SystemSettings;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingsService _settingsService;

    public SystemSettingsController(ISystemSettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user identity.");
        }

        return userId;
    }

    [HttpGet]
    [Authorize(Policy = "Permissions.View")]
    [ProducesResponseType(typeof(SystemSettingsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        return Ok(await _settingsService.GetSettingsAsync(cancellationToken));
    }

    [HttpPut]
    [Authorize(Policy = "Roles.Manage")]
    [ProducesResponseType(typeof(SystemSettingsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateSettings(
        [FromBody] UpdateSystemSettingsRequest request,
        CancellationToken cancellationToken)
    {
        var actorId = GetCurrentUserId();
        var actorEmail = User.FindFirstValue(ClaimTypes.Email);
        var updated = await _settingsService.UpdateSettingsAsync(request, actorId, actorEmail, cancellationToken);
        return Ok(updated);
    }

    [HttpGet("system-info")]
    [Authorize(Policy = "Permissions.View")]
    [ProducesResponseType(typeof(SystemInformationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSystemInformation(CancellationToken cancellationToken)
    {
        return Ok(await _settingsService.GetSystemInformationAsync(Request.IsHttps, cancellationToken));
    }

    [HttpGet("ai-config")]
    [Authorize(Policy = "AI.View")]
    [ProducesResponseType(typeof(SafeAiConfigurationResponse), StatusCodes.Status200OK)]
    public IActionResult GetAiConfiguration()
    {
        return Ok(_settingsService.GetSafeAiConfiguration());
    }
}
