using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CitizenRequestsController : ControllerBase
{
    private readonly ICitizenRequestService _citizenRequestService;

    public CitizenRequestsController(
        ICitizenRequestService citizenRequestService)
    {
        _citizenRequestService = citizenRequestService;
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(
        [FromBody] CreateCitizenRequest request)
    {
        var userId = int.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _citizenRequestService.CreateAsync(
            request, userId);

        return StatusCode(StatusCodes.Status201Created, result);
    }

    [HttpGet("my")]
    [Authorize]
    public async Task<IActionResult> GetMyRequests()
    {
        var userId = int.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _citizenRequestService.GetMyRequestsAsync(userId);

        return Ok(result);
    }

    [HttpGet]
    [Authorize(Policy = "CitizenRequests.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _citizenRequestService.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "CitizenRequests.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _citizenRequestService.GetByIdAsync(id);

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateCitizenRequest request)
    {
        var userId = int.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var result = await _citizenRequestService.UpdateAsync(
            id, userId, request);

        return Ok(result);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "CitizenRequests.Manage")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        [FromBody] UpdateCitizenRequestStatus request)
    {
        var result = await _citizenRequestService.UpdateStatusAsync(
            id, request);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = int.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        await _citizenRequestService.DeleteAsync(id, userId);

        return NoContent();
    }
}