namespace HumanitarianCrisisManagement.Application.DTOs.Warehouses;

public class WarehouseResponse
{
    public int WarehouseId { get; set; }

    public string WarehouseName { get; set; } = string.Empty;

    public string WarehouseCode { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Address { get; set; } = string.Empty;

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public int AreaId { get; set; }

    public string AreaName { get; set; } = string.Empty;

    public string? ContactPerson { get; set; }

    public string? ContactNumber { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}