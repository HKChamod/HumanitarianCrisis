using HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;
using HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class ResourceAllocationService : IResourceAllocationService
{
    private readonly ApplicationDbContext _context;
    private readonly IInventoryTransactionService _inventoryTransactionService;

    public ResourceAllocationService(
        ApplicationDbContext context,
        IInventoryTransactionService inventoryTransactionService)
    {
        _context = context;
        _inventoryTransactionService = inventoryTransactionService;
    }

    public async Task<ResourceAllocationResponse> CreateAsync(
    CreateResourceAllocationRequest request,
    int requestedByUserId)
    {
        if (request.QuantityRequested <= 0)
            throw new ArgumentException("Requested quantity must be greater than zero.");

        var inventory = await _context.WarehouseInventories
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i => i.InventoryId == request.InventoryId);

        if (inventory == null)
            throw new KeyNotFoundException("Warehouse inventory not found.");

        if (!inventory.Warehouse.IsActive)
            throw new InvalidOperationException("Selected warehouse is inactive.");

        if (!inventory.Resource.IsActive)
            throw new InvalidOperationException("Selected resource is inactive.");

        var crisis = await _context.CrisisEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CrisisId == request.CrisisId);

        if (crisis == null)
            throw new KeyNotFoundException("Crisis event not found.");

        if (string.Equals(crisis.Status, "Closed", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(crisis.Status, "Resolved", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Cannot create a resource allocation for a crisis event with status '{crisis.Status}'. Only open or active crisis events are eligible.");
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.UserId == requestedByUserId && u.IsActive);

        if (user == null)
            throw new UnauthorizedAccessException("Active user not found.");

        var allocation = new ResourceAllocation
        {
            InventoryId = request.InventoryId,
            CrisisId = request.CrisisId,
            QuantityRequested = request.QuantityRequested,
            QuantityAllocated = 0,
            Status = ResourceAllocationStatus.Pending,
            RequestedByUserId = requestedByUserId,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.ResourceAllocations.Add(allocation);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(allocation.AllocationId);
    }

    public async Task<ResourceAllocationResponse> GetByIdAsync(int id)
    {
        var allocation = await _context.ResourceAllocations
            .AsNoTracking()
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(a => a.Crisis)
            .Include(a => a.RequestedByUser)
            .Include(a => a.ApprovedByUser)
            .FirstOrDefaultAsync(a => a.AllocationId == id);

        if (allocation == null)
            throw new KeyNotFoundException("Resource allocation not found.");

        return new ResourceAllocationResponse
        {
            AllocationId = allocation.AllocationId,

            InventoryId = allocation.InventoryId,
            WarehouseName = allocation.Inventory.Warehouse.WarehouseName,

            ResourceId = allocation.Inventory.ResourceId,
            ResourceName = allocation.Inventory.Resource.ResourceName,

            CrisisId = allocation.CrisisId,
            CrisisName = allocation.Crisis.CrisisName,

            QuantityRequested = allocation.QuantityRequested,
            QuantityAllocated = allocation.QuantityAllocated,

            Status = allocation.Status.ToString(),

            RequestedByUserId = allocation.RequestedByUserId,
            RequestedByUserName = allocation.RequestedByUser.FullName,

            ApprovedByUserId = allocation.ApprovedByUserId,
            ApprovedByUserName = allocation.ApprovedByUser?.FullName,

            ReferenceNumber = allocation.ReferenceNumber,
            Notes = allocation.Notes,

            CreatedAt = allocation.CreatedAt,
            UpdatedAt = allocation.UpdatedAt
        };
    }

    public async Task<List<ResourceAllocationResponse>> GetAllAsync()
    {
        var allocations = await _context.ResourceAllocations
            .AsNoTracking()
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(a => a.Crisis)
            .Include(a => a.RequestedByUser)
            .Include(a => a.ApprovedByUser)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return allocations.Select(a => new ResourceAllocationResponse
        {
            AllocationId = a.AllocationId,
            InventoryId = a.InventoryId,
            WarehouseName = a.Inventory.Warehouse.WarehouseName,
            ResourceId = a.Inventory.ResourceId,
            ResourceName = a.Inventory.Resource.ResourceName,
            CrisisId = a.CrisisId,
            CrisisName = a.Crisis.CrisisName,
            QuantityRequested = a.QuantityRequested,
            QuantityAllocated = a.QuantityAllocated,
            Status = a.Status.ToString(),
            RequestedByUserId = a.RequestedByUserId,
            RequestedByUserName = a.RequestedByUser.FullName,
            ApprovedByUserId = a.ApprovedByUserId,
            ApprovedByUserName = a.ApprovedByUser?.FullName,
            ReferenceNumber = a.ReferenceNumber,
            Notes = a.Notes,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        }).ToList();
    }

    public async Task<List<ResourceAllocationResponse>> GetMyAllocationsAsync(
    int userId)
    {
        var allocations = await _context.ResourceAllocations
            .AsNoTracking()
            .Where(a => a.RequestedByUserId == userId)
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(a => a.Crisis)
            .Include(a => a.RequestedByUser)
            .Include(a => a.ApprovedByUser)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        return allocations.Select(a => new ResourceAllocationResponse
        {
            AllocationId = a.AllocationId,
            InventoryId = a.InventoryId,
            WarehouseName = a.Inventory.Warehouse.WarehouseName,
            ResourceId = a.Inventory.ResourceId,
            ResourceName = a.Inventory.Resource.ResourceName,
            CrisisId = a.CrisisId,
            CrisisName = a.Crisis.CrisisName,
            QuantityRequested = a.QuantityRequested,
            QuantityAllocated = a.QuantityAllocated,
            Status = a.Status.ToString(),
            RequestedByUserId = a.RequestedByUserId,
            RequestedByUserName = a.RequestedByUser.FullName,
            ApprovedByUserId = a.ApprovedByUserId,
            ApprovedByUserName = a.ApprovedByUser?.FullName,
            ReferenceNumber = a.ReferenceNumber,
            Notes = a.Notes,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt
        }).ToList();
    }


    public async Task<ResourceAllocationResponse> ApproveAsync(
        int id,
        UpdateResourceAllocationStatusRequest request,
        int approvedByUserId)
    {
        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var allocation = await _context.ResourceAllocations
            .FirstOrDefaultAsync(a => a.AllocationId == id);

        if (allocation == null)
            throw new KeyNotFoundException("Resource allocation not found.");

        if (allocation.Status != ResourceAllocationStatus.Pending)
            throw new InvalidOperationException(
                "Only pending allocations can be approved.");

        if (!request.QuantityAllocated.HasValue ||
            request.QuantityAllocated.Value <= 0)
        {
            throw new ArgumentException(
                "Allocated quantity must be greater than zero.");
        }

        if (request.QuantityAllocated.Value > allocation.QuantityRequested)
            throw new ArgumentException(
                "Allocated quantity cannot exceed requested quantity.");

        var inventory = await _context.WarehouseInventories
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i => i.InventoryId == allocation.InventoryId);

        if (inventory == null)
            throw new KeyNotFoundException("Warehouse inventory not found.");

        if (!inventory.Warehouse.IsActive || !inventory.Resource.IsActive)
            throw new InvalidOperationException(
                "Warehouse or resource is inactive.");

        var approverExists = await _context.Users
            .AnyAsync(u => u.UserId == approvedByUserId && u.IsActive);

        if (!approverExists)
            throw new UnauthorizedAccessException("Active approver not found.");

        allocation.QuantityAllocated = request.QuantityAllocated.Value;
        allocation.Status = ResourceAllocationStatus.Approved;
        allocation.ApprovedByUserId = approvedByUserId;
        allocation.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            allocation.Notes = request.Notes.Trim();

        await _context.SaveChangesAsync();
        await dbTransaction.CommitAsync();

        return await GetByIdAsync(id);
    }



    public async Task<ResourceAllocationResponse> RejectAsync(
        int id,
        UpdateResourceAllocationStatusRequest request)
    {
        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var allocation = await _context.ResourceAllocations
            .FirstOrDefaultAsync(a => a.AllocationId == id);

        if (allocation == null)
            throw new KeyNotFoundException("Resource allocation not found.");

        if (allocation.Status != ResourceAllocationStatus.Pending)
            throw new InvalidOperationException(
                "Only pending allocations can be rejected.");

        allocation.Status = ResourceAllocationStatus.Rejected;
        allocation.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            allocation.Notes = request.Notes.Trim();

        await _context.SaveChangesAsync();
        await dbTransaction.CommitAsync();

        return await GetByIdAsync(id);
    }



    public async Task<ResourceAllocationResponse> DispatchAsync(
        int id,
        UpdateResourceAllocationStatusRequest request,
        int performedByUserId)
    {
        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var allocation = await _context.ResourceAllocations
            .FirstOrDefaultAsync(a => a.AllocationId == id);

        if (allocation == null)
            throw new KeyNotFoundException("Resource allocation not found.");

        if (allocation.Status != ResourceAllocationStatus.Approved)
            throw new InvalidOperationException(
                "Only approved allocations can be dispatched.");

        if (allocation.QuantityAllocated <= 0)
            throw new InvalidOperationException(
                "Allocated quantity must be greater than zero.");

        var dispatchNotes = !string.IsNullOrWhiteSpace(request.Notes)
            ? request.Notes.Trim()
            : allocation.Notes;

        var transactionRequest = new CreateInventoryTransactionRequest
        {
            InventoryId = allocation.InventoryId,
            TransactionType = InventoryTransactionType.StockOut,
            Quantity = allocation.QuantityAllocated,
            ReferenceNumber = allocation.ReferenceNumber
                ?? $"ALLOCATION-{allocation.AllocationId}",
            Notes = $"Resource dispatched for Crisis ID {allocation.CrisisId}. " +
                    (dispatchNotes ?? string.Empty)
        };

        await _inventoryTransactionService.CreateAsync(
            transactionRequest,
            performedByUserId);

        allocation.Status = ResourceAllocationStatus.Dispatched;
        allocation.UpdatedAt = DateTime.UtcNow;
        allocation.Notes = dispatchNotes;

        await _context.SaveChangesAsync();
        await dbTransaction.CommitAsync();

        return await GetByIdAsync(id);
    }



    public async Task<ResourceAllocationResponse> DeliverAsync(
        int id,
        UpdateResourceAllocationStatusRequest request)
    {
        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var allocation = await _context.ResourceAllocations
            .FirstOrDefaultAsync(a => a.AllocationId == id);

        if (allocation == null)
            throw new KeyNotFoundException("Resource allocation not found.");

        if (allocation.Status != ResourceAllocationStatus.Dispatched)
            throw new InvalidOperationException(
                "Only dispatched allocations can be marked as delivered.");

        allocation.Status = ResourceAllocationStatus.Delivered;
        allocation.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            allocation.Notes = request.Notes.Trim();

        await _context.SaveChangesAsync();
        await dbTransaction.CommitAsync();

        return await GetByIdAsync(id);
    }



    public async Task<ResourceAllocationResponse> CancelAsync(
        int id,
        UpdateResourceAllocationStatusRequest request,
        int performedByUserId)
    {
        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var allocation = await _context.ResourceAllocations
            .FirstOrDefaultAsync(a => a.AllocationId == id);

        if (allocation == null)
            throw new KeyNotFoundException("Resource allocation not found.");

        if (allocation.Status == ResourceAllocationStatus.Cancelled ||
            allocation.Status == ResourceAllocationStatus.Delivered ||
            allocation.Status == ResourceAllocationStatus.Rejected)
        {
            throw new InvalidOperationException(
                "This allocation cannot be cancelled.");
        }

        if (allocation.Status == ResourceAllocationStatus.Dispatched)
        {
            var transactionRequest = new CreateInventoryTransactionRequest
            {
                InventoryId = allocation.InventoryId,
                TransactionType = InventoryTransactionType.StockIn,
                Quantity = allocation.QuantityAllocated,
                ReferenceNumber = allocation.ReferenceNumber
                    ?? $"CANCEL-{allocation.AllocationId}",
                Notes = $"Stock returned due to cancellation of Allocation ID {allocation.AllocationId}. " +
                        (request.Notes?.Trim() ?? string.Empty)
            };

            await _inventoryTransactionService.CreateAsync(
                transactionRequest,
                performedByUserId);
        }

        allocation.Status = ResourceAllocationStatus.Cancelled;
        allocation.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            allocation.Notes = request.Notes.Trim();

        await _context.SaveChangesAsync();
        await dbTransaction.CommitAsync();

        return await GetByIdAsync(id);
    }

}
