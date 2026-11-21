using HumanitarianCrisisManagement.Application.DTOs.Warehouses;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Warehouses.View")]
public class WarehousesController : ControllerBase
{
    private readonly IWarehouseService _warehouseService;

    public WarehousesController(IWarehouseService warehouseService)
    {
        _warehouseService = warehouseService;
    }

    [HttpPost]
    [Authorize(Policy = "Warehouses.Manage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateWarehouseRequest request)
    {
        var result = await _warehouseService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.WarehouseId },
            result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _warehouseService.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _warehouseService.GetByIdAsync(id);

        return Ok(result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Warehouses.Manage")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateWarehouseRequest request)
    {
        var result = await _warehouseService.UpdateAsync(id, request);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Warehouses.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _warehouseService.DeleteAsync(id);

        return NoContent();
    }
}