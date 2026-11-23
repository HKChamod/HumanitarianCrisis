namespace HumanitarianCrisisManagement.Application.DTOs.WarehouseInventories;

public class WarehouseInventoryResponse
{
    public int InventoryId { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int ResourceId { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceCategory { get; set; } = string.Empty;
    public decimal QuantityAvailable { get; set; }
    public decimal ReorderLevel { get; set; }
    public bool IsLowStock { get; set; }
    public DateTime LastUpdatedAt { get; set; }
}