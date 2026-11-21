using HumanitarianCrisisManagement.Application.DTOs.WarehouseInventories;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class WarehouseInventoryService : IWarehouseInventoryService
{
    private readonly ApplicationDbContext _context;

    public WarehouseInventoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<WarehouseInventoryResponse> CreateAsync(
        CreateWarehouseInventoryRequest request)
    {
        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w =>
                w.WarehouseId == request.WarehouseId && w.IsActive);

        if (warehouse == null)
            throw new KeyNotFoundException("Active warehouse not found.");

        var resource = await _context.Resources
            .FirstOrDefaultAsync(r =>
                r.ResourceId == request.ResourceId && r.IsActive);

        if (resource == null)
            throw new KeyNotFoundException("Active resource not found.");

        var alreadyExists = await _context.WarehouseInventories
            .AnyAsync(i =>
                i.WarehouseId == request.WarehouseId &&
                i.ResourceId == request.ResourceId);

        if (alreadyExists)
            throw new InvalidOperationException(
                "This resource already exists in the selected warehouse.");

        var inventory = new WarehouseInventory
        {
            WarehouseId = request.WarehouseId,
            ResourceId = request.ResourceId,
            QuantityAvailable = 0,
            ReorderLevel = request.ReorderLevel,
            LastUpdatedAt = DateTime.UtcNow
        };

        _context.WarehouseInventories.Add(inventory);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(inventory.InventoryId);
    }

    public async Task<IReadOnlyList<WarehouseInventoryResponse>> GetAllAsync()
    {
        return await _context.WarehouseInventories
            .AsNoTracking()
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .OrderBy(i => i.Warehouse.WarehouseName)
            .ThenBy(i => i.Resource.ResourceName)
            .Select(i => MapToResponse(i))
            .ToListAsync();
    }

    public async Task<IReadOnlyList<WarehouseInventoryResponse>>
        GetByWarehouseIdAsync(int warehouseId)
    {
        var warehouseExists = await _context.Warehouses
            .AnyAsync(w => w.WarehouseId == warehouseId);

        if (!warehouseExists)
            throw new KeyNotFoundException("Warehouse not found.");

        return await _context.WarehouseInventories
            .AsNoTracking()
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .Where(i => i.WarehouseId == warehouseId)
            .OrderBy(i => i.Resource.ResourceName)
            .Select(i => MapToResponse(i))
            .ToListAsync();
    }

    public async Task<WarehouseInventoryResponse> GetByIdAsync(int id)
    {
        var inventory = await _context.WarehouseInventories
            .AsNoTracking()
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i => i.InventoryId == id);

        if (inventory == null)
            throw new KeyNotFoundException("Inventory record not found.");

        return MapToResponse(inventory);
    }

    public async Task<WarehouseInventoryResponse> UpdateReorderLevelAsync(
        int id,
        UpdateWarehouseInventoryRequest request)
    {
        var inventory = await _context.WarehouseInventories
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i => i.InventoryId == id);

        if (inventory == null)
            throw new KeyNotFoundException("Inventory record not found.");

        inventory.ReorderLevel = request.ReorderLevel;
        inventory.LastUpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToResponse(inventory);
    }

    public async Task DeleteAsync(int id)
    {
        var inventory = await _context.WarehouseInventories
            .FirstOrDefaultAsync(i => i.InventoryId == id);

        if (inventory == null)
            throw new KeyNotFoundException("Inventory record not found.");

        _context.WarehouseInventories.Remove(inventory);
        await _context.SaveChangesAsync();
    }

    private static WarehouseInventoryResponse MapToResponse(
        WarehouseInventory inventory)
    {
        return new WarehouseInventoryResponse
        {
            InventoryId = inventory.InventoryId,
            WarehouseId = inventory.WarehouseId,
            WarehouseName = inventory.Warehouse.WarehouseName,
            ResourceId = inventory.ResourceId,
            ResourceName = inventory.Resource.ResourceName,
            ResourceCategory = inventory.Resource.ResourceCategory,
            QuantityAvailable = inventory.QuantityAvailable,
            ReorderLevel = inventory.ReorderLevel,
            IsLowStock = inventory.QuantityAvailable <= inventory.ReorderLevel,
            LastUpdatedAt = inventory.LastUpdatedAt
        };
    }
}