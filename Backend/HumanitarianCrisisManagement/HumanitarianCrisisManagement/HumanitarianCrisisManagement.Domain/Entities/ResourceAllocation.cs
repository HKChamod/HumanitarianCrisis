
using HumanitarianCrisisManagement.Domain.Enums;

namespace HumanitarianCrisisManagement.Domain.Entities;

public class ResourceAllocation
{
    public int AllocationId { get; set; }

    public int InventoryId { get; set; }

    public int CrisisId { get; set; }

    public decimal QuantityRequested { get; set; }

    public decimal QuantityAllocated { get; set; }

    public ResourceAllocationStatus Status { get; set; }
        = ResourceAllocationStatus.Pending;

    public int RequestedByUserId { get; set; }

    public int? ApprovedByUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }

    public WarehouseInventory Inventory { get; set; } = null!;

    public CrisisEvent Crisis { get; set; } = null!;

    public User RequestedByUser { get; set; } = null!;

    public User? ApprovedByUser { get; set; }
}
