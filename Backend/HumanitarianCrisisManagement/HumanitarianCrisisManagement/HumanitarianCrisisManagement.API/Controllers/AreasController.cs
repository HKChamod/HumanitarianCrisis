
using HumanitarianCrisisManagement.Application.DTOs.Areas;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AreasController : ControllerBase
{
    private readonly IAreaService _areaService;

    public AreasController(IAreaService areaService)
    {
        _areaService = areaService;
    }

    [HttpPost]
    [Authorize(Policy = "Areas.Manage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateAreaRequest request)
    {
        var result = await _areaService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.AreaId },
            result);
    }

    [HttpGet]
    [Authorize(Policy = "Areas.View")]
    public async Task<IActionResult> GetAll()
    {
        var result = await _areaService.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("hierarchy")]
    [Authorize(Policy = "Areas.View")]
    public async Task<IActionResult> GetHierarchy()
    {
        var result = await _areaService.GetHierarchyAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "Areas.View")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _areaService.GetByIdAsync(id);

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Areas.Manage")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateAreaRequest request)
    {
        var result = await _areaService.UpdateAsync(id, request);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Areas.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _areaService.DeleteAsync(id);

        return NoContent();
    }
}
