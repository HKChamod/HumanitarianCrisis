namespace HumanitarianCrisisManagement.Domain.Entities;

public class WarehouseInventory
{
    public int InventoryId { get; set; }

    public int WarehouseId { get; set; }

    public int ResourceId { get; set; }

    public decimal QuantityAvailable { get; set; }

    public decimal ReorderLevel { get; set; }

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Warehouse Warehouse { get; set; } = null!;

    public Resource Resource { get; set; } = null!;
}