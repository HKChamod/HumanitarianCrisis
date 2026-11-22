using HumanitarianCrisisManagement.Domain.Enums;

namespace HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;

public class InventoryTransactionResponse
{
    public int InventoryTransactionId { get; set; }

    public int InventoryId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public string ResourceName { get; set; } = string.Empty;

    public InventoryTransactionType TransactionType { get; set; }

    public decimal Quantity { get; set; }

    public decimal PreviousQuantity { get; set; }

    public decimal NewQuantity { get; set; }

    public string? ReferenceNumber { get; set; }

    public string? Notes { get; set; }

    public int PerformedByUserId { get; set; }

    public string PerformedByUserName { get; set; } = string.Empty;

    public Guid? TransferGroupId { get; set; }

    public DateTime CreatedAt { get; set; }
}
