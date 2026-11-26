using HumanitarianCrisisManagement.Application.DTOs.AuditLogs;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "AuditLogs.View")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AuditLogResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRecent(
        [FromQuery] string? entityType = null,
        [FromQuery] string? action = null,
        [FromQuery] int limit = 100)
    {
        return Ok(await _auditLogService.GetRecentAsync(entityType, action, limit));
    }
}
