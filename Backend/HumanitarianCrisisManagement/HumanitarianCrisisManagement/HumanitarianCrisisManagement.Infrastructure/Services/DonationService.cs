using System.Data;
using HumanitarianCrisisManagement.Application.DTOs.Donations;
using HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class DonationService : IDonationService
{
    private readonly ApplicationDbContext _context;
    private readonly IInventoryTransactionService _inventoryTransactionService;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public DonationService(
        ApplicationDbContext context,
        IInventoryTransactionService inventoryTransactionService,
        IAuditLogService auditLogService,
        INotificationService notificationService)
    {
        _context = context;
        _inventoryTransactionService = inventoryTransactionService;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<DonationResponse>> GetAllAsync(
        string? donationType = null,
        string? status = null)
    {
        var query = BuildDetailQuery();

        if (!string.IsNullOrWhiteSpace(donationType))
            query = query.Where(d => d.DonationType == donationType.Trim());

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(d => d.Status == status.Trim());

        var items = await query
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return items.Select(MapToResponse).ToList();
    }

    public async Task<DonationResponse> GetByIdAsync(int donationId)
    {
        var item = await BuildDetailQuery().FirstOrDefaultAsync(d => d.DonationId == donationId);
        if (item == null)
            throw new KeyNotFoundException("Donation record not found.");

        return MapToResponse(item);
    }

    public async Task<DonationResponse> CreateAsync(CreateDonationRequest request, int? actorUserId)
    {
        var type = request.DonationType.Trim();
        if (!type.Equals("Monetary", StringComparison.OrdinalIgnoreCase) &&
            !type.Equals("Resource", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("DonationType must be 'Monetary' or 'Resource'.");
        }

        var canonicalType = type.Equals("Monetary", StringComparison.OrdinalIgnoreCase) ? "Monetary" : "Resource";

        if (canonicalType == "Monetary")
        {
            if (!request.Amount.HasValue || request.Amount.Value <= 0)
                throw new ArgumentException("Monetary donations require an amount greater than zero.");
        }
        else
        {
            if (!request.ResourceId.HasValue || !request.Quantity.HasValue || request.Quantity.Value <= 0)
                throw new ArgumentException("Resource donations require a valid ResourceId and Quantity greater than zero.");

            var resourceExists = await _context.Resources.AnyAsync(r => r.ResourceId == request.ResourceId.Value && r.IsActive);
            if (!resourceExists)
                throw new KeyNotFoundException("Active resource not found.");

            if (request.WarehouseId.HasValue)
            {
                var warehouseExists = await _context.Warehouses.AnyAsync(w => w.WarehouseId == request.WarehouseId.Value && w.IsActive);
                if (!warehouseExists)
                    throw new KeyNotFoundException("Active warehouse not found.");
            }
        }

        if (request.CrisisId.HasValue)
        {
            var crisisExists = await _context.CrisisEvents.AnyAsync(c => c.CrisisId == request.CrisisId.Value);
            if (!crisisExists)
                throw new KeyNotFoundException("Crisis event not found.");
        }

        var trimmedRef = string.IsNullOrWhiteSpace(request.ReferenceNumber) ? null : request.ReferenceNumber.Trim();
        if (trimmedRef != null)
        {
            var duplicateRef = await _context.Donations.AnyAsync(d => d.ReferenceNumber == trimmedRef);
            if (duplicateRef)
                throw new InvalidOperationException($"A donation with reference number '{trimmedRef}' already exists.");
        }

        var donation = new Donation
        {
            DonorName = request.DonorName.Trim(),
            DonorEmail = request.DonorEmail?.Trim(),
            DonorPhone = request.DonorPhone?.Trim(),
            DonorUserId = actorUserId,
            DonationType = canonicalType,
            Amount = canonicalType == "Monetary" ? request.Amount : null,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "LKR" : request.Currency.Trim().ToUpperInvariant(),
            ResourceId = canonicalType == "Resource" ? request.ResourceId : null,
            WarehouseId = canonicalType == "Resource" ? request.WarehouseId : null,
            Quantity = canonicalType == "Resource" ? request.Quantity : null,
            CrisisId = request.CrisisId,
            ReferenceNumber = trimmedRef,
            Status = "Pending",
            Notes = request.Notes?.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.Donations.Add(donation);
        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Donation.Created",
            "Donation",
            donation.DonationId.ToString(),
            $"Recorded {donation.DonationType} donation #{donation.DonationId} (status Pending).");

        await _notificationService.NotifyUsersByRoleAsync(
            "Administrator",
            $"New {donation.DonationType} Donation",
            $"Donation #{donation.DonationId} has been logged and is pending verification.",
            "Donation",
            "Info",
            "Donation",
            donation.DonationId);

        return await GetByIdAsync(donation.DonationId);
    }

    public async Task<DonationResponse> VerifyAsync(
        int donationId,
        VerifyDonationRequest request,
        int actorUserId)
    {
        var decision = request.Decision.Trim();
        if (!decision.Equals("Verified", StringComparison.OrdinalIgnoreCase) &&
            !decision.Equals("Completed", StringComparison.OrdinalIgnoreCase) &&
            !decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
        {
            throw new ArgumentException("Decision must be 'Verified', 'Completed', or 'Rejected'.");
        }

        var canonicalDecision = decision.Equals("Rejected", StringComparison.OrdinalIgnoreCase)
            ? "Rejected"
            : decision.Equals("Completed", StringComparison.OrdinalIgnoreCase)
                ? "Completed"
                : "Verified";

        await using var tx = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var donation = await _context.Donations.FirstOrDefaultAsync(d => d.DonationId == donationId);
        if (donation == null)
            throw new KeyNotFoundException("Donation record not found.");

        if (donation.Status == "Completed" || donation.Status == "Rejected")
            throw new InvalidOperationException($"Donation #{donationId} is already '{donation.Status}' and cannot be processed again.");

        if (donation.Status == "Verified" && canonicalDecision == "Verified")
            throw new InvalidOperationException($"Donation #{donationId} has already been verified.");

        // For Resource donations being Verified/Completed: automatically stock-in into WarehouseInventory once!
        if (donation.DonationType == "Resource" &&
            (canonicalDecision == "Verified" || canonicalDecision == "Completed") &&
            !donation.InventoryTransactionId.HasValue)
        {
            var targetWarehouseId = request.WarehouseId ?? donation.WarehouseId;
            if (!targetWarehouseId.HasValue)
                throw new ArgumentException("WarehouseId is required to verify a resource donation and add it to inventory.");

            var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseId == targetWarehouseId.Value && w.IsActive);
            if (warehouse == null)
                throw new KeyNotFoundException("Target active warehouse not found.");

            var inventory = await _context.WarehouseInventories
                .FirstOrDefaultAsync(i => i.WarehouseId == targetWarehouseId.Value && i.ResourceId == donation.ResourceId!.Value);

            if (inventory == null)
            {
                inventory = new WarehouseInventory
                {
                    WarehouseId = targetWarehouseId.Value,
                    ResourceId = donation.ResourceId!.Value,
                    QuantityAvailable = 0,
                    ReorderLevel = 10,
                    LastUpdatedAt = DateTime.UtcNow
                };
                _context.WarehouseInventories.Add(inventory);
                await _context.SaveChangesAsync();
            }

            var stockIn = await _inventoryTransactionService.CreateAsync(
                new CreateInventoryTransactionRequest
                {
                    InventoryId = inventory.InventoryId,
                    TransactionType = InventoryTransactionType.StockIn,
                    Quantity = donation.Quantity!.Value,
                    ReferenceNumber = donation.ReferenceNumber ?? $"DONATION-{donation.DonationId}",
                    Notes = $"Stock-in from verified resource donation #{donation.DonationId}."
                },
                actorUserId);

            donation.WarehouseId = targetWarehouseId.Value;
            donation.InventoryTransactionId = stockIn.InventoryTransactionId;
            canonicalDecision = "Completed";
        }

        donation.Status = canonicalDecision;
        donation.VerifiedByUserId = actorUserId;
        donation.VerifiedAt = DateTime.UtcNow;
        if (!string.IsNullOrWhiteSpace(request.Notes))
            donation.Notes = request.Notes.Trim();
        donation.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            $"Donation.{canonicalDecision}",
            "Donation",
            donation.DonationId.ToString(),
            $"Donation #{donation.DonationId} marked '{canonicalDecision}'" +
            (donation.InventoryTransactionId.HasValue ? $" (linked InventoryTransaction #{donation.InventoryTransactionId})." : "."));

        return await GetByIdAsync(donation.DonationId);
    }

    private IQueryable<Donation> BuildDetailQuery() =>
        _context.Donations
            .AsNoTracking()
            .Include(d => d.Resource)
            .Include(d => d.Warehouse)
            .Include(d => d.Crisis)
            .Include(d => d.VerifiedByUser);

    private static DonationResponse MapToResponse(Donation d) => new()
    {
        DonationId = d.DonationId,
        DonorName = d.DonorName,
        DonorEmail = d.DonorEmail,
        DonorPhone = d.DonorPhone,
        DonorUserId = d.DonorUserId,
        DonationType = d.DonationType,
        Amount = d.Amount,
        Currency = d.Currency,
        ResourceId = d.ResourceId,
        ResourceName = d.Resource?.ResourceName,
        WarehouseId = d.WarehouseId,
        WarehouseName = d.Warehouse?.WarehouseName,
        Quantity = d.Quantity,
        InventoryTransactionId = d.InventoryTransactionId,
        CrisisId = d.CrisisId,
        CrisisName = d.Crisis?.CrisisName,
        ReferenceNumber = d.ReferenceNumber,
        Status = d.Status,
        VerifiedByUserId = d.VerifiedByUserId,
        VerifiedByUserName = d.VerifiedByUser?.FullName,
        VerifiedAt = d.VerifiedAt,
        Notes = d.Notes,
        CreatedAt = d.CreatedAt,
        UpdatedAt = d.UpdatedAt
    };
}
