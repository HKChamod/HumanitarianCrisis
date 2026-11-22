
using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ResourceAllocationsController : ControllerBase
{
    private readonly IResourceAllocationService _resourceAllocationService;

    public ResourceAllocationsController(
        IResourceAllocationService resourceAllocationService)
    {
        _resourceAllocationService = resourceAllocationService;
    }

    private int GetCurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userId, out var parsedUserId))
            throw new UnauthorizedAccessException("Invalid user identity.");

        return parsedUserId;
    }

    // Create allocation request
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateResourceAllocationRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await _resourceAllocationService.CreateAsync(
            request, userId);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.AllocationId },
            result);
    }

    // Get my allocations
    [HttpGet("my")]
    public async Task<IActionResult> GetMyAllocations()
    {
        var userId = GetCurrentUserId();

        var result = await _resourceAllocationService
            .GetMyAllocationsAsync(userId);

        return Ok(result);
    }

    // Get all allocations
    [HttpGet]
    [Authorize(Policy = "ResourceAllocations.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _resourceAllocationService.GetAllAsync();

        return Ok(result);
    }

    // Get allocation by ID
    [HttpGet("{id:int}")]
    [Authorize(Policy = "ResourceAllocations.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _resourceAllocationService.GetByIdAsync(id);

        return Ok(result);
    }

    // Approve allocation
    [HttpPatch("{id:int}/approve")]
    [Authorize(Policy = "ResourceAllocations.Manage")]
    public async Task<IActionResult> Approve(
        int id,
        [FromBody] UpdateResourceAllocationStatusRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await _resourceAllocationService.ApproveAsync(
            id, request, userId);

        return Ok(result);
    }

    // Reject allocation
    [HttpPatch("{id:int}/reject")]
    [Authorize(Policy = "ResourceAllocations.Manage")]
    public async Task<IActionResult> Reject(
        int id,
        [FromBody] UpdateResourceAllocationStatusRequest request)
    {
        var result = await _resourceAllocationService.RejectAsync(
            id, request);

        return Ok(result);
    }

    // Dispatch allocation
    [HttpPatch("{id:int}/dispatch")]
    [Authorize(Policy = "ResourceAllocations.Manage")]
    public async Task<IActionResult> Dispatch(
        int id,
        [FromBody] UpdateResourceAllocationStatusRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await _resourceAllocationService.DispatchAsync(
            id, request, userId);

        return Ok(result);
    }

    // Mark allocation as delivered
    [HttpPatch("{id:int}/deliver")]
    [Authorize(Policy = "ResourceAllocations.Manage")]
    public async Task<IActionResult> Deliver(
        int id,
        [FromBody] UpdateResourceAllocationStatusRequest request)
    {
        var result = await _resourceAllocationService.DeliverAsync(
            id, request);

        return Ok(result);
    }

    // Cancel allocation
    [HttpPatch("{id:int}/cancel")]
    [Authorize(Policy = "ResourceAllocations.Manage")]
    public async Task<IActionResult> Cancel(
        int id,
        [FromBody] UpdateResourceAllocationStatusRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await _resourceAllocationService.CancelAsync(
            id, request, userId);

        return Ok(result);
    }
}
