
using HumanitarianCrisisManagement.Application.DTOs.CrisisEvents;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CrisisEventsController : ControllerBase
{
    private readonly ICrisisEventService _crisisEventService;

    public CrisisEventsController(
        ICrisisEventService crisisEventService)
    {
        _crisisEventService = crisisEventService;
    }

    [HttpPost]
    [Authorize(Policy = "CrisisEvents.Create")]
    public async Task<IActionResult> Create(
        [FromBody] CreateCrisisEventRequest request)
    {
        var result = await _crisisEventService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.CrisisId },
            result);
    }

    [HttpGet]
    [Authorize(Policy = "CrisisEvents.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _crisisEventService.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "CrisisEvents.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _crisisEventService.GetByIdAsync(id);

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "CrisisEvents.Update")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateCrisisEventRequest request)
    {
        var result = await _crisisEventService.UpdateAsync(id, request);

        return Ok(result);
    }

    [HttpPatch("{id:int}/status")]
    [Authorize(Policy = "CrisisEvents.Update")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        [FromBody] UpdateCrisisStatusRequest request)
    {
        var result = await _crisisEventService.UpdateStatusAsync(id, request);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "CrisisEvents.Delete")]
    public async Task<IActionResult> Delete(int id)
    {
        await _crisisEventService.DeleteAsync(id);

        return NoContent();
    }
}
