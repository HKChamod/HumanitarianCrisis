using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Volunteers;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VolunteersController : ControllerBase
{
    private readonly IVolunteerService _volunteerService;

    public VolunteersController(IVolunteerService volunteerService)
    {
        _volunteerService = volunteerService;
    }

    private int? TryGetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }

    private int GetCurrentUserId() =>
        TryGetCurrentUserId() ?? throw new UnauthorizedAccessException("Invalid user identity.");

    [HttpGet]
    [Authorize(Policy = "Volunteers.View")]
    [ProducesResponseType(typeof(IReadOnlyList<VolunteerResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? availabilityStatus = null,
        [FromQuery] string? approvalStatus = null)
    {
        return Ok(await _volunteerService.GetAllAsync(availabilityStatus, approvalStatus));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "Volunteers.View")]
    [ProducesResponseType(typeof(VolunteerResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(int id)
    {
        return Ok(await _volunteerService.GetByIdAsync(id));
    }

    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(VolunteerResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Register([FromBody] CreateVolunteerRequest request)
    {
        var created = await _volunteerService.RegisterAsync(request, TryGetCurrentUserId());
        return CreatedAtAction(nameof(GetById), new { id = created.VolunteerId }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Volunteers.Manage")]
    [ProducesResponseType(typeof(VolunteerResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateVolunteerRequest request)
    {
        return Ok(await _volunteerService.UpdateAsync(id, request, GetCurrentUserId()));
    }

    [HttpPatch("{id:int}/approval")]
    [Authorize(Policy = "Volunteers.Approve")]
    [ProducesResponseType(typeof(VolunteerResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateApproval(int id, [FromBody] UpdateVolunteerApprovalRequest request)
    {
        return Ok(await _volunteerService.UpdateApprovalAsync(id, request, GetCurrentUserId()));
    }

    [HttpGet("assignments")]
    [Authorize(Policy = "Volunteers.View")]
    [ProducesResponseType(typeof(IReadOnlyList<VolunteerAssignmentResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssignments(
        [FromQuery] int? volunteerId = null,
        [FromQuery] int? crisisId = null)
    {
        return Ok(await _volunteerService.GetAssignmentsAsync(volunteerId, crisisId));
    }

    [HttpPost("assignments")]
    [Authorize(Policy = "Volunteers.Manage")]
    [ProducesResponseType(typeof(VolunteerAssignmentResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAssignment([FromBody] CreateVolunteerAssignmentRequest request)
    {
        var created = await _volunteerService.CreateAssignmentAsync(request, GetCurrentUserId());
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPatch("assignments/{assignmentId:int}/status")]
    [Authorize(Policy = "Volunteers.Manage")]
    [ProducesResponseType(typeof(VolunteerAssignmentResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdateAssignmentStatus(
        int assignmentId,
        [FromBody] UpdateVolunteerAssignmentStatusRequest request)
    {
        return Ok(await _volunteerService.UpdateAssignmentStatusAsync(assignmentId, request, GetCurrentUserId()));
    }
}
