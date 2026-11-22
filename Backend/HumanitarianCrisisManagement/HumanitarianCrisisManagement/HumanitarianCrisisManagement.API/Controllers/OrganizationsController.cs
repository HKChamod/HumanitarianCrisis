using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _organizationService;
    private readonly IOrganizationMembershipService _membershipService;
    private readonly IOrganizationAuthorizationService _organizationAuthorizationService;
    private readonly IAuthorizationService _authorizationService;

    public OrganizationsController(
        IOrganizationService organizationService,
        IOrganizationMembershipService membershipService,
        IOrganizationAuthorizationService organizationAuthorizationService,
        IAuthorizationService authorizationService)
    {
        _organizationService = organizationService;
        _membershipService = membershipService;
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
                Detail = detail
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

    private async Task<IActionResult?> AuthorizeOrganizationActionAsync(
        int organizationId,
        int userId,
        string permissionPolicy)
    {
        var headerError = ValidateOptionalOrganizationHeader(organizationId);
        if (headerError != null)
        {
            return headerError;
        }

        var globalAuth = await _authorizationService.AuthorizeAsync(
            User,
            permissionPolicy);

        if (globalAuth.Succeeded)
        {
            return null;
        }

        var hasOrgPermission = await _organizationAuthorizationService
            .HasOrganizationPermissionAsync(userId, organizationId, permissionPolicy);

        if (hasOrgPermission)
        {
            return null;
        }

        return ForbiddenProblem(
            $"You do not have '{permissionPolicy}' permission for this organization.");
    }

    [HttpPost]
    [Authorize(Policy = "Organizations.Manage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrganizationRequest request)
    {
        var result = await _organizationService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.OrganizationId },
            result);
    }

    [HttpGet]
    [Authorize(Policy = "Organizations.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _organizationService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "Organizations.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _organizationService.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Organizations.Manage")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateOrganizationRequest request)
    {
        var result = await _organizationService.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Organizations.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _organizationService.DeleteAsync(id);
        return NoContent();
    }

    [HttpGet("my-memberships")]
    [Authorize]
    public async Task<IActionResult> GetMyMemberships()
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var result = await _membershipService.GetMyMembershipsAsync(userId);
        return Ok(result);
    }

    [HttpGet("{id:int}/my-access")]
    [Authorize]
    public async Task<IActionResult> GetMyOrganizationAccess(int id)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var headerError = ValidateOptionalOrganizationHeader(id);
        if (headerError != null)
        {
            return headerError;
        }

        var result = await _membershipService.GetMyOrganizationAccessAsync(id, userId);

        if (result == null)
        {
            return ForbiddenProblem(
                "You do not have an approved membership in this active organization.");
        }

        return Ok(result);
    }

    [HttpPost("{id:int}/members")]
    [Authorize]
    public async Task<IActionResult> RequestMembership(int id)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var result = await _membershipService.RequestMembershipAsync(
            id,
            userId);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("{id:int}/members")]
    [Authorize]
    public async Task<IActionResult> GetMembers(int id)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var authFailure = await AuthorizeOrganizationActionAsync(
            id,
            userId,
            "Organizations.View");

        if (authFailure != null)
        {
            return authFailure;
        }

        var result = await _membershipService.GetMembersAsync(id);

        return Ok(result);
    }

    [HttpPatch("{id:int}/members/{membershipId:int}/approve")]
    [Authorize]
    public async Task<IActionResult> ApproveMembership(
        int id,
        int membershipId)
    {
        if (!TryGetCurrentUserId(out var approvedByUserId))
        {
            return Unauthorized();
        }

        var authFailure = await AuthorizeOrganizationActionAsync(
            id,
            approvedByUserId,
            "Organizations.ApproveMembers");

        if (authFailure != null)
        {
            return authFailure;
        }

        var result = await _membershipService.ApproveMembershipAsync(
            id,
            membershipId,
            approvedByUserId);

        return Ok(result);
    }

    [HttpPatch("{id:int}/members/{membershipId:int}/reject")]
    [Authorize]
    public async Task<IActionResult> RejectMembership(
        int id,
        int membershipId)
    {
        if (!TryGetCurrentUserId(out var userId))
        {
            return Unauthorized();
        }

        var authFailure = await AuthorizeOrganizationActionAsync(
            id,
            userId,
            "Organizations.ApproveMembers");

        if (authFailure != null)
        {
            return authFailure;
        }

        var result = await _membershipService.RejectMembershipAsync(
            id,
            membershipId);

        return Ok(result);
    }

    [HttpPut("{id:int}/members/{membershipId:int}/roles")]
    [Authorize]
    public async Task<IActionResult> AssignRoles(
        int id,
        int membershipId,
        [FromBody] AssignOrganizationRolesRequest request)
    {
        if (!TryGetCurrentUserId(out var assignedByUserId))
        {
            return Unauthorized();
        }

        var authFailure = await AuthorizeOrganizationActionAsync(
            id,
            assignedByUserId,
            "Organizations.Manage");

        if (authFailure != null)
        {
            return authFailure;
        }

        var result = await _membershipService.AssignRolesAsync(
            id,
            membershipId,
            request,
            assignedByUserId);

        return Ok(result);
    }
}
