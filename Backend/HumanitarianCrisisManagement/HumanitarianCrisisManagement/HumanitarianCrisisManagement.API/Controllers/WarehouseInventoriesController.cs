using HumanitarianCrisisManagement.Application.DTOs.WarehouseInventories;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Inventory.View")]
public class WarehouseInventoriesController : ControllerBase
{
    private readonly IWarehouseInventoryService _inventoryService;

    public WarehouseInventoriesController(
        IWarehouseInventoryService inventoryService)
    {
        _inventoryService = inventoryService;
    }

    [HttpPost]
    [Authorize(Policy = "Inventory.Manage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateWarehouseInventoryRequest request)
    {
        var result = await _inventoryService.CreateAsync(request);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.InventoryId },
            result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _inventoryService.GetAllAsync();

        return Ok(result);
    }

    [HttpGet("warehouse/{warehouseId:int}")]
    public async Task<IActionResult> GetByWarehouseId(int warehouseId)
    {
        var result = await _inventoryService.GetByWarehouseIdAsync(warehouseId);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _inventoryService.GetByIdAsync(id);

        return Ok(result);
    }

    [HttpPut("{id:int}/reorder-level")]
    [Authorize(Policy = "Inventory.Manage")]
    public async Task<IActionResult> UpdateReorderLevel(
        int id,
        [FromBody] UpdateWarehouseInventoryRequest request)
    {
        var result = await _inventoryService.UpdateReorderLevelAsync(id, request);

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "Inventory.Manage")]
    public async Task<IActionResult> Delete(int id)
    {
        await _inventoryService.DeleteAsync(id);

        return NoContent();
    }
}