using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrganizationsController : ControllerBase
{
    private readonly IOrganizationService _organizationService;

    public OrganizationsController(IOrganizationService organizationService)
    {
        _organizationService = organizationService;
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
}
