namespace HumanitarianCrisisManagement.Domain.Entities;

public class Warehouse
{
    public int WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public string WarehouseCode { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Address { get; set; } = string.Empty;

    public int AreaId { get; set; }

    public string? ContactPerson { get; set; }

    public string? ContactNumber { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    public Area Area { get; set; } = null!;
}