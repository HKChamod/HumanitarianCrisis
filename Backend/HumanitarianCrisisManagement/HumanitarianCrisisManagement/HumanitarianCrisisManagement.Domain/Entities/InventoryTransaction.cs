using HumanitarianCrisisManagement.Domain.Enums;

namespace HumanitarianCrisisManagement.Domain.Entities;

public class InventoryTransaction
{
    public int InventoryTransactionId { get; set; }

    public int InventoryId { get; set; }

    public InventoryTransactionType TransactionType { get; set; }

    public decimal Quantity { get; set; }

    public decimal PreviousQuantity { get; set; }

    public decimal NewQuantity { get; set; }

    public string? ReferenceNumber { get; set; }

    public string? Notes { get; set; }

    public int PerformedByUserId { get; set; }

    public Guid? TransferGroupId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public WarehouseInventory Inventory { get; set; } = null!;

    public User PerformedByUser { get; set; } = null!;
}
