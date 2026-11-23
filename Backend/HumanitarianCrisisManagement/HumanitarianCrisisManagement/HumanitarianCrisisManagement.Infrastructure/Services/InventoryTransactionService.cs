
using System.Data;
using HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class InventoryTransactionService : IInventoryTransactionService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService? _auditLogService;

    public InventoryTransactionService(
        ApplicationDbContext context,
        IAuditLogService? auditLogService = null)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    // Stock In, Stock Out and Adjustment

    public async Task<InventoryTransactionResponse> CreateAsync(
        CreateInventoryTransactionRequest request,
        int performedByUserId)
    {
        // Reuse an existing transaction when called by another service.
        await using var dbTransaction =
            _context.Database.CurrentTransaction == null
                ? await _context.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable)
                : null;

        var inventory = await _context.WarehouseInventories
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i => i.InventoryId == request.InventoryId);

        if (inventory == null)
            throw new KeyNotFoundException("Inventory record not found.");

        if (!inventory.Warehouse.IsActive || !inventory.Resource.IsActive)
            throw new InvalidOperationException(
                "Cannot process transactions for inactive warehouse or resource.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.UserId == performedByUserId && u.IsActive);

        if (user == null)
            throw new KeyNotFoundException("Active user not found.");

        if (request.TransactionType == InventoryTransactionType.TransferIn ||
            request.TransactionType == InventoryTransactionType.TransferOut)
        {
            throw new InvalidOperationException(
                "Use the transfer endpoint for warehouse transfers.");
        }

        if (!Enum.IsDefined(request.TransactionType))
            throw new InvalidOperationException("Invalid transaction type.");

        if (request.TransactionType == InventoryTransactionType.Adjustment)
        {
            if (request.Quantity == 0)
                throw new InvalidOperationException(
                    "Adjustment quantity cannot be zero.");
        }
        else if (request.Quantity <= 0)
        {
            throw new InvalidOperationException(
                "Transaction quantity must be greater than zero.");
        }

        decimal previousQuantity = inventory.QuantityAvailable;
        decimal newQuantity;

        switch (request.TransactionType)
        {
            case InventoryTransactionType.StockIn:
                newQuantity = previousQuantity + request.Quantity;
                break;

            case InventoryTransactionType.StockOut:
                newQuantity = previousQuantity - request.Quantity;
                break;

            case InventoryTransactionType.Adjustment:
                newQuantity = previousQuantity + request.Quantity;
                break;

            default:
                throw new InvalidOperationException(
                    "Unsupported transaction type.");
        }

        if (newQuantity < 0)
            throw new InvalidOperationException(
                "Insufficient available stock.");

        var now = DateTime.UtcNow;

        inventory.QuantityAvailable = newQuantity;
        inventory.LastUpdatedAt = now;

        var transaction = new InventoryTransaction
        {
            InventoryId = inventory.InventoryId,
            Inventory = inventory,
            TransactionType = request.TransactionType,
            Quantity = request.Quantity,
            PreviousQuantity = previousQuantity,
            NewQuantity = newQuantity,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            PerformedByUserId = performedByUserId,
            PerformedByUser = user,
            CreatedAt = now
        };

        _context.InventoryTransactions.Add(transaction);

        await _context.SaveChangesAsync();

        // Commit only when this method created the transaction.
        if (dbTransaction != null)
            await dbTransaction.CommitAsync();

        if (_auditLogService != null && dbTransaction != null)
        {
            await _auditLogService.RecordAsync(
                performedByUserId,
                null,
                $"Inventory.{transaction.TransactionType}",
                "InventoryTransaction",
                transaction.InventoryTransactionId.ToString(),
                $"{transaction.TransactionType} of {transaction.Quantity} on inventory #{transaction.InventoryId} ({previousQuantity} -> {newQuantity}).");
        }

        return MapToResponse(transaction);
    }


    // Get all transactions
    public async Task<IReadOnlyList<InventoryTransactionResponse>> GetAllAsync()
    {
        var transactions = await _context.InventoryTransactions
            .AsNoTracking()
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(t => t.PerformedByUser)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(MapToResponse).ToList();
    }

    // Get transactions by inventory
    public async Task<IReadOnlyList<InventoryTransactionResponse>>
        GetByInventoryIdAsync(int inventoryId)
    {
        var inventoryExists = await _context.WarehouseInventories
            .AnyAsync(i => i.InventoryId == inventoryId);

        if (!inventoryExists)
            throw new KeyNotFoundException("Inventory record not found.");

        var transactions = await _context.InventoryTransactions
            .AsNoTracking()
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(t => t.PerformedByUser)
            .Where(t => t.InventoryId == inventoryId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return transactions.Select(MapToResponse).ToList();
    }

    // Get transaction by ID
    public async Task<InventoryTransactionResponse> GetByIdAsync(int id)
    {
        var transaction = await _context.InventoryTransactions
            .AsNoTracking()
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(t => t.PerformedByUser)
            .FirstOrDefaultAsync(t =>
                t.InventoryTransactionId == id);

        if (transaction == null)
            throw new KeyNotFoundException("Inventory transaction not found.");

        return MapToResponse(transaction);
    }

    // Get paired transfer records
    public async Task<IReadOnlyList<InventoryTransactionResponse>>
        GetByTransferGroupIdAsync(Guid transferGroupId)
    {
        var transactions = await _context.InventoryTransactions
            .AsNoTracking()
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(t => t.Inventory)
                .ThenInclude(i => i.Resource)
            .Include(t => t.PerformedByUser)
            .Where(t => t.TransferGroupId == transferGroupId)
            .OrderBy(t => t.TransactionType)
            .ToListAsync();

        if (transactions.Count == 0)
            throw new KeyNotFoundException("Transfer records not found.");

        return transactions.Select(MapToResponse).ToList();
    }

    // Transfer stock between warehouses
    public async Task<IReadOnlyList<InventoryTransactionResponse>> TransferAsync(
        TransferInventoryRequest request,
        int performedByUserId)
    {
        if (request.SourceInventoryId == request.DestinationInventoryId)
            throw new InvalidOperationException(
                "Source and destination inventory must be different.");

        if (request.Quantity <= 0)
            throw new InvalidOperationException(
                "Transfer quantity must be greater than zero.");

        await using var dbTransaction =
            await _context.Database.BeginTransactionAsync(
                IsolationLevel.Serializable);

        var source = await _context.WarehouseInventories
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i =>
                i.InventoryId == request.SourceInventoryId);

        var destination = await _context.WarehouseInventories
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .FirstOrDefaultAsync(i =>
                i.InventoryId == request.DestinationInventoryId);

        if (source == null || destination == null)
            throw new KeyNotFoundException(
                "Source or destination inventory record not found.");

        if (source.ResourceId != destination.ResourceId)
            throw new InvalidOperationException(
                "Both inventories must contain the same resource.");

        if (!source.Warehouse.IsActive ||
            !destination.Warehouse.IsActive ||
            !source.Resource.IsActive)
        {
            throw new InvalidOperationException(
                "Cannot transfer stock through inactive warehouse or resource.");
        }

        if (source.QuantityAvailable < request.Quantity)
            throw new InvalidOperationException(
                "Insufficient stock in the source warehouse.");

        var user = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.UserId == performedByUserId && u.IsActive);

        if (user == null)
            throw new KeyNotFoundException("Active user not found.");

        var transferGroupId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        decimal sourcePrevious = source.QuantityAvailable;
        decimal destinationPrevious = destination.QuantityAvailable;

        decimal sourceNew = sourcePrevious - request.Quantity;
        decimal destinationNew = destinationPrevious + request.Quantity;

        source.QuantityAvailable = sourceNew;
        source.LastUpdatedAt = now;

        destination.QuantityAvailable = destinationNew;
        destination.LastUpdatedAt = now;

        var transferOut = new InventoryTransaction
        {
            InventoryId = source.InventoryId,
            Inventory = source,
            TransactionType = InventoryTransactionType.TransferOut,
            Quantity = request.Quantity,
            PreviousQuantity = sourcePrevious,
            NewQuantity = sourceNew,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            PerformedByUserId = performedByUserId,
            PerformedByUser = user,
            TransferGroupId = transferGroupId,
            CreatedAt = now
        };

        var transferIn = new InventoryTransaction
        {
            InventoryId = destination.InventoryId,
            Inventory = destination,
            TransactionType = InventoryTransactionType.TransferIn,
            Quantity = request.Quantity,
            PreviousQuantity = destinationPrevious,
            NewQuantity = destinationNew,
            ReferenceNumber = request.ReferenceNumber?.Trim(),
            Notes = request.Notes?.Trim(),
            PerformedByUserId = performedByUserId,
            PerformedByUser = user,
            TransferGroupId = transferGroupId,
            CreatedAt = now
        };

        _context.InventoryTransactions.AddRange(
            transferOut,
            transferIn);

        await _context.SaveChangesAsync();
        await dbTransaction.CommitAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.RecordAsync(
                performedByUserId,
                null,
                "Inventory.Transfer",
                "InventoryTransaction",
                transferGroupId.ToString(),
                $"Transferred {request.Quantity} unit(s) from inventory #{source.InventoryId} to #{destination.InventoryId}.");
        }

        return new List<InventoryTransactionResponse>
        {
            MapToResponse(transferOut),
            MapToResponse(transferIn)
        };
    }

    // Map entity to response DTO
    private static InventoryTransactionResponse MapToResponse(
        InventoryTransaction transaction)
    {
        return new InventoryTransactionResponse
        {
            InventoryTransactionId = transaction.InventoryTransactionId,
            InventoryId = transaction.InventoryId,
            WarehouseName = transaction.Inventory.Warehouse.WarehouseName,
            ResourceName = transaction.Inventory.Resource.ResourceName,
            TransactionType = transaction.TransactionType,
            Quantity = transaction.Quantity,
            PreviousQuantity = transaction.PreviousQuantity,
            NewQuantity = transaction.NewQuantity,
            ReferenceNumber = transaction.ReferenceNumber,
            Notes = transaction.Notes,
            PerformedByUserId = transaction.PerformedByUserId,
            PerformedByUserName = transaction.PerformedByUser.FullName,
            TransferGroupId = transaction.TransferGroupId,
            CreatedAt = transaction.CreatedAt
        };
    }
}
