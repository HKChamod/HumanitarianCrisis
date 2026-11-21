using HumanitarianCrisisManagement.Application.DTOs.Resources;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Resources.View")]
public class ResourcesController : ControllerBase
{
    private readonly IResourceService _resourceService;

    public ResourcesController(IResourceService resourceService)
    {
        _resourceService = resourceService;
    }

    [HttpPost]
    [Authorize(Policy = "Resources.Manage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateResourceRequest request)
    {
        var result = await _resourceService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.ResourceId },
            result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _resourceService.GetAllAsync();
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _resourceService.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Resources.Manage")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateResourceRequest request)
    {
        var result = await _resourceService.UpdateAsync(id, request);
        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Resources.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _resourceService.DeleteAsync(id);
        return NoContent();
    }
}