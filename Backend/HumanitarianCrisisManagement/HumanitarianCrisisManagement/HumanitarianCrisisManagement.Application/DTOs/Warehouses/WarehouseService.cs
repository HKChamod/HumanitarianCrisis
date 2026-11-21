using HumanitarianCrisisManagement.Application.DTOs.Warehouses;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class WarehouseService : IWarehouseService
{
    private readonly ApplicationDbContext _context;

    public WarehouseService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<WarehouseResponse> CreateAsync(CreateWarehouseRequest request)
    {
        var warehouseCode = request.WarehouseCode.Trim();

        var codeExists = await _context.Warehouses
            .AnyAsync(w => w.WarehouseCode.ToLower() == warehouseCode.ToLower());

        if (codeExists)
            throw new InvalidOperationException("Warehouse code already exists.");

        var areaExists = await _context.Areas
            .AnyAsync(a => a.AreaId == request.AreaId && a.IsActive);

        if (!areaExists)
            throw new KeyNotFoundException("Active area not found.");

        var warehouse = new Warehouse
        {
            WarehouseName = request.WarehouseName.Trim(),
            WarehouseCode = warehouseCode,
            Description = request.Description?.Trim(),
            Address = request.Address.Trim(),
            AreaId = request.AreaId,
            ContactPerson = request.ContactPerson?.Trim(),
            ContactNumber = request.ContactNumber?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(warehouse.WarehouseId);
    }

    public async Task<IReadOnlyList<WarehouseResponse>> GetAllAsync()
    {
        return await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.Area)
            .OrderBy(w => w.WarehouseName)
            .Select(w => MapToResponse(w))
            .ToListAsync();
    }

    public async Task<WarehouseResponse> GetByIdAsync(int id)
    {
        var warehouse = await _context.Warehouses
            .AsNoTracking()
            .Include(w => w.Area)
            .FirstOrDefaultAsync(w => w.WarehouseId == id);

        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found.");

        return MapToResponse(warehouse);
    }

    public async Task<WarehouseResponse> UpdateAsync(
        int id,
        UpdateWarehouseRequest request)
    {
        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.WarehouseId == id);

        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found.");

        var warehouseCode = request.WarehouseCode.Trim();

        var codeExists = await _context.Warehouses
            .AnyAsync(w =>
                w.WarehouseId != id &&
                w.WarehouseCode.ToLower() == warehouseCode.ToLower());

        if (codeExists)
            throw new InvalidOperationException("Warehouse code already exists.");

        var areaExists = await _context.Areas
            .AnyAsync(a => a.AreaId == request.AreaId && a.IsActive);

        if (!areaExists)
            throw new KeyNotFoundException("Active area not found.");

        warehouse.WarehouseName = request.WarehouseName.Trim();
        warehouse.WarehouseCode = warehouseCode;
        warehouse.Description = request.Description?.Trim();
        warehouse.Address = request.Address.Trim();
        warehouse.AreaId = request.AreaId;
        warehouse.ContactPerson = request.ContactPerson?.Trim();
        warehouse.ContactNumber = request.ContactNumber?.Trim();
        warehouse.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        var warehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.WarehouseId == id);

        if (warehouse == null)
            throw new KeyNotFoundException("Warehouse not found.");

        _context.Warehouses.Remove(warehouse);
        await _context.SaveChangesAsync();
    }

    private static WarehouseResponse MapToResponse(Warehouse warehouse)
    {
        return new WarehouseResponse
        {
            WarehouseId = warehouse.WarehouseId,
            WarehouseName = warehouse.WarehouseName,
            WarehouseCode = warehouse.WarehouseCode,
            Description = warehouse.Description,
            Address = warehouse.Address,
            AreaId = warehouse.AreaId,
            AreaName = warehouse.Area.AreaName,
            ContactPerson = warehouse.ContactPerson,
            ContactNumber = warehouse.ContactNumber,
            IsActive = warehouse.IsActive,
            CreatedAt = warehouse.CreatedAt
        };
    }
}