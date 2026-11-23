using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Notifications;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationsController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var userId))
            throw new UnauthorizedAccessException("Invalid user identity.");
        return userId;
    }

    [HttpGet("my")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyNotifications(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] int limit = 50)
    {
        return Ok(await _notificationService.GetForUserAsync(GetCurrentUserId(), unreadOnly, limit));
    }

    [HttpGet]
    [Authorize(Policy = "Notifications.View")]
    [ProducesResponseType(typeof(IReadOnlyList<NotificationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 100)
    {
        if (User.IsInRole("Administrator"))
            return Ok(await _notificationService.GetAllRecentAsync(limit));

        return Ok(await _notificationService.GetForUserAsync(GetCurrentUserId(), false, limit));
    }

    [HttpPost]
    [Authorize(Roles = "Administrator")]
    [ProducesResponseType(typeof(NotificationResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
    {
        var created = await _notificationService.CreateAsync(request);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPatch("{id:int}/read")]
    [ProducesResponseType(typeof(NotificationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        return Ok(await _notificationService.MarkAsReadAsync(id, GetCurrentUserId()));
    }

    [HttpPatch("read-all")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var count = await _notificationService.MarkAllAsReadAsync(GetCurrentUserId());
        return Ok(new { markedReadCount = count });
    }
}
