
using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = "Inventory.View")]
public class InventoryTransactionsController : ControllerBase
{
    private readonly IInventoryTransactionService _service;

    public InventoryTransactionsController(
        IInventoryTransactionService service)
    {
        _service = service;
    }

    // Stock In, Stock Out or Adjustment
    [HttpPost]
    [Authorize(Policy = "Inventory.Manage")]
    public async Task<IActionResult> Create(
        [FromBody] CreateInventoryTransactionRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await _service.CreateAsync(request, userId);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.InventoryTransactionId },
            result);
    }

    // Get all transactions
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _service.GetAllAsync();
        return Ok(result);
    }

    // Get transactions for a specific inventory
    [HttpGet("inventory/{inventoryId:int}")]
    public async Task<IActionResult> GetByInventoryId(int inventoryId)
    {
        var result = await _service.GetByInventoryIdAsync(inventoryId);
        return Ok(result);
    }

    // Get transaction by ID
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _service.GetByIdAsync(id);
        return Ok(result);
    }

    // Get paired transfer records
    [HttpGet("transfer/{transferGroupId:guid}")]
    public async Task<IActionResult> GetByTransferGroupId(
        Guid transferGroupId)
    {
        var result = await _service.GetByTransferGroupIdAsync(transferGroupId);
        return Ok(result);
    }

    // Transfer stock between warehouses
    [HttpPost("transfer")]
    [Authorize(Policy = "Inventory.Manage")]
    public async Task<IActionResult> Transfer(
        [FromBody] TransferInventoryRequest request)
    {
        var userId = GetCurrentUserId();

        var result = await _service.TransferAsync(request, userId);

        return Ok(result);
    }

    private int GetCurrentUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!int.TryParse(userIdValue, out var userId))
        {
            throw new UnauthorizedAccessException(
                "Invalid user identification in token.");
        }

        return userId;
    }
}
