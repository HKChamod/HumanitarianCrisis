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

    public OrganizationsController(
    IOrganizationService organizationService,
    IOrganizationMembershipService membershipService)
    {
        _organizationService = organizationService;
        _membershipService = membershipService;
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

    [HttpPost("{id:int}/members")]
    [Authorize]
    public async Task<IActionResult> RequestMembership(int id)
    {
        if (!int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var userId))
        {
            return Unauthorized();
        }

        var result = await _membershipService.RequestMembershipAsync(
            id,
            userId);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("{id:int}/members")]
    [Authorize(Policy = "Organizations.View")]
    public async Task<IActionResult> GetMembers(int id)
    {
        var result = await _membershipService.GetMembersAsync(id);

        return Ok(result);
    }

    [HttpPatch("{id:int}/members/{membershipId:int}/approve")]
    [Authorize(Policy = "Organizations.ApproveMembers")]
    public async Task<IActionResult> ApproveMembership(
    int id,
    int membershipId)
    {
        if (!int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var approvedByUserId))
        {
            return Unauthorized();
        }

        var result = await _membershipService.ApproveMembershipAsync(
            id,
            membershipId,
            approvedByUserId);

        return Ok(result);
    }

    [HttpPatch("{id:int}/members/{membershipId:int}/reject")]
    [Authorize(Policy = "Organizations.ApproveMembers")]
    public async Task<IActionResult> RejectMembership(
    int id,
    int membershipId)
    {
        var result = await _membershipService.RejectMembershipAsync(
            id,
            membershipId);

        return Ok(result);
    }

    [HttpPut("{id:int}/members/{membershipId:int}/roles")]
    [Authorize(Policy = "Organizations.Manage")]
    public async Task<IActionResult> AssignRoles(
    int id,
    int membershipId,
    [FromBody] AssignOrganizationRolesRequest request)
    {
        if (!int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var assignedByUserId))
        {
            return Unauthorized();
        }

        var result = await _membershipService.AssignRolesAsync(
            id,
            membershipId,
            request,
            assignedByUserId);

        return Ok(result);
    }
}
