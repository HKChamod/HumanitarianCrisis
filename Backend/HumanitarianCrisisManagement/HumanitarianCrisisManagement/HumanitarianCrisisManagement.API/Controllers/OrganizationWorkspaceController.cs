using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/organizations/{organizationId:int}")]
[Authorize]
public class OrganizationWorkspaceController : ControllerBase
{
    private readonly IOrganizationWorkspaceService _workspaceService;
    private readonly IOrganizationAuthorizationService _organizationAuthorizationService;
    private readonly IAuthorizationService _authorizationService;

    public OrganizationWorkspaceController(
        IOrganizationWorkspaceService workspaceService,
        IOrganizationAuthorizationService organizationAuthorizationService,
        IAuthorizationService authorizationService)
    {
        _workspaceService = workspaceService;
        _organizationAuthorizationService = organizationAuthorizationService;
        _authorizationService = authorizationService;
    }

    private bool TryGetCurrentUserId(out int userId)
    {
        return int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out userId);
    }

    private IActionResult ForbiddenProblem(string detail)
    {
        return StatusCode(
            StatusCodes.Status403Forbidden,
            new ProblemDetails
            {
                Status = StatusCodes.Status403Forbidden,
                Title = "Forbidden",
                Detail = detail,
            });
    }

    private IActionResult? ValidateOptionalOrganizationHeader(int organizationId)
    {
        if (Request.Headers.TryGetValue("X-Organization-Id", out var headerValues))
        {
            var rawValue = headerValues.ToString().Trim();
            if (!string.IsNullOrEmpty(rawValue) &&
                (!int.TryParse(rawValue, out var headerOrgId) || headerOrgId != organizationId))
            {
                return ForbiddenProblem(
                    "The X-Organization-Id header does not match the requested organization.");
            }
        }

        return null;
    }

    private async Task<IActionResult?> AuthorizeActiveMemberAsync(int organizationId, int userId)
    {
        var headerError = ValidateOptionalOrganizationHeader(organizationId);
        if (headerError != null) return headerError;

        var globalAuth = await _authorizationService.AuthorizeAsync(User, "Organizations.View");
        if (globalAuth.Succeeded) return null;

        var isMember = await _organizationAuthorizationService
            .HasActiveApprovedMembershipAsync(userId, organizationId);
        if (isMember) return null;

        return ForbiddenProblem("You do not have an approved membership in this active organization.");
    }

    private async Task<IActionResult?> AuthorizeAnyPermissionAsync(
        int organizationId,
        int userId,
        params string[] permissionPolicies)
    {
        var headerError = ValidateOptionalOrganizationHeader(organizationId);
        if (headerError != null) return headerError;

        foreach (var policy in permissionPolicies)
        {
            var globalAuth = await _authorizationService.AuthorizeAsync(User, policy);
            if (globalAuth.Succeeded) return null;

            var hasOrgPermission = await _organizationAuthorizationService
                .HasOrganizationPermissionAsync(userId, organizationId, policy);
            if (hasOrgPermission) return null;
        }

        return ForbiddenProblem(
            $"You do not have permission ({string.Join(" or ", permissionPolicies)}) for this organization.");
    }

    // ------------------------------------------------------------
    // Dashboard
    // ------------------------------------------------------------

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(int organizationId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeActiveMemberAsync(organizationId, userId);
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.GetDashboardAsync(organizationId));
    }

    // ------------------------------------------------------------
    // Response Teams
    // ------------------------------------------------------------

    [HttpGet("teams")]
    public async Task<IActionResult> GetTeams(int organizationId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeActiveMemberAsync(organizationId, userId);
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.GetTeamsAsync(organizationId));
    }

    [HttpGet("teams/{teamId:int}")]
    public async Task<IActionResult> GetTeamById(int organizationId, int teamId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeActiveMemberAsync(organizationId, userId);
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.GetTeamByIdAsync(organizationId, teamId));
    }

    [HttpPost("teams")]
    public async Task<IActionResult> CreateTeam(
        int organizationId,
        [FromBody] CreateResponseTeamRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Volunteers.Manage",
            "Resources.Manage");
        if (authFailure != null) return authFailure;

        var created = await _workspaceService.CreateTeamAsync(organizationId, request, userId);
        return CreatedAtAction(nameof(GetTeamById), new { organizationId, teamId = created.ResponseTeamId }, created);
    }

    [HttpPut("teams/{teamId:int}")]
    public async Task<IActionResult> UpdateTeam(
        int organizationId,
        int teamId,
        [FromBody] UpdateResponseTeamRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Volunteers.Manage",
            "Resources.Manage");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.UpdateTeamAsync(organizationId, teamId, request, userId));
    }

    [HttpPatch("teams/{teamId:int}/status")]
    public async Task<IActionResult> UpdateTeamStatus(
        int organizationId,
        int teamId,
        [FromBody] UpdateResponseTeamStatusRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Volunteers.Manage",
            "Resources.Manage");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.UpdateTeamStatusAsync(organizationId, teamId, request.Status, userId));
    }

    [HttpPost("teams/{teamId:int}/members")]
    public async Task<IActionResult> AddTeamMember(
        int organizationId,
        int teamId,
        [FromBody] AddResponseTeamMemberRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Organizations.ApproveMembers",
            "Volunteers.Manage");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.AddTeamMemberAsync(organizationId, teamId, request, userId));
    }

    [HttpDelete("teams/{teamId:int}/members/{membershipId:int}")]
    public async Task<IActionResult> RemoveTeamMember(
        int organizationId,
        int teamId,
        int membershipId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Organizations.ApproveMembers",
            "Volunteers.Manage");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.RemoveTeamMemberAsync(organizationId, teamId, membershipId, userId));
    }

    [HttpPost("teams/{teamId:int}/deployments")]
    public async Task<IActionResult> DeployTeam(
        int organizationId,
        int teamId,
        [FromBody] CreateTeamDeploymentRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Resources.Allocate",
            "Volunteers.Manage");
        if (authFailure != null) return authFailure;

        var deployment = await _workspaceService.DeployTeamAsync(organizationId, teamId, request, userId);
        return StatusCode(StatusCodes.Status201Created, deployment);
    }

    [HttpPatch("teams/{teamId:int}/deployments/{deploymentId:int}/complete")]
    public async Task<IActionResult> CompleteDeployment(
        int organizationId,
        int teamId,
        int deploymentId,
        [FromBody] CompleteTeamDeploymentRequest? request = null)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Resources.Allocate",
            "Volunteers.Manage");
        if (authFailure != null) return authFailure;

        var status = string.IsNullOrWhiteSpace(request?.Status) ? "Completed" : request.Status;
        return Ok(await _workspaceService.CompleteDeploymentAsync(organizationId, teamId, deploymentId, status, userId));
    }

    // ------------------------------------------------------------
    // Assigned Areas
    // ------------------------------------------------------------

    [HttpGet("areas")]
    public async Task<IActionResult> GetAssignedAreas(int organizationId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeActiveMemberAsync(organizationId, userId);
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.GetAssignedAreasAsync(organizationId));
    }

    [HttpPost("areas")]
    public async Task<IActionResult> AssignArea(
        int organizationId,
        [FromBody] AssignOrganizationAreaRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Areas.Manage");
        if (authFailure != null) return authFailure;

        var created = await _workspaceService.AssignAreaAsync(organizationId, request, userId);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPut("areas/{organizationAreaId:int}")]
    public async Task<IActionResult> UpdateAssignedArea(
        int organizationId,
        int organizationAreaId,
        [FromBody] UpdateOrganizationAreaRequest request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Areas.Manage");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.UpdateAssignedAreaAsync(organizationId, organizationAreaId, request, userId));
    }

    [HttpDelete("areas/{organizationAreaId:int}")]
    public async Task<IActionResult> RemoveAssignedArea(int organizationId, int organizationAreaId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "Organizations.Manage",
            "Areas.Manage");
        if (authFailure != null) return authFailure;

        await _workspaceService.RemoveAssignedAreaAsync(organizationId, organizationAreaId, userId);
        return NoContent();
    }

    // ------------------------------------------------------------
    // Organization-Scoped Aid Requests
    // ------------------------------------------------------------

    [HttpGet("aid-requests")]
    public async Task<IActionResult> GetAidRequests(int organizationId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeActiveMemberAsync(organizationId, userId);
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.GetAidRequestsAsync(organizationId));
    }

    [HttpPatch("aid-requests/{requestId:int}/status")]
    public async Task<IActionResult> UpdateAidRequestStatus(
        int organizationId,
        int requestId,
        [FromBody] UpdateOrgAidRequestStatusInput request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "CitizenRequests.Manage",
            "Organizations.Manage",
            "Resources.Allocate");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.UpdateAidRequestStatusAsync(organizationId, requestId, request.Status, userId));
    }

    [HttpPost("aid-requests/{requestId:int}/assign-team")]
    public async Task<IActionResult> AssignTeamToAidRequest(
        int organizationId,
        int requestId,
        [FromBody] AssignTeamToAidRequestInput request)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeAnyPermissionAsync(
            organizationId,
            userId,
            "CitizenRequests.Manage",
            "Organizations.Manage",
            "Resources.Allocate");
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.AssignTeamToAidRequestAsync(organizationId, requestId, request, userId));
    }

    // ------------------------------------------------------------
    // Organization-Scoped Logistics
    // ------------------------------------------------------------

    [HttpGet("logistics")]
    public async Task<IActionResult> GetLogistics(int organizationId)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var authFailure = await AuthorizeActiveMemberAsync(organizationId, userId);
        if (authFailure != null) return authFailure;

        return Ok(await _workspaceService.GetLogisticsAsync(organizationId));
    }
}
