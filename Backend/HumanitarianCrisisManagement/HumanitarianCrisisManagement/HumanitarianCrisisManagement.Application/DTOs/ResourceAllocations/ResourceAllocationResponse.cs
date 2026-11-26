namespace HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;

public class ResourceAllocationResponse
{
    public int AllocationId { get; set; }

    public int InventoryId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public decimal? WarehouseLatitude { get; set; }
    public decimal? WarehouseLongitude { get; set; }

    public int ResourceId { get; set; }
    public string ResourceName { get; set; } = string.Empty;

    public int CrisisId { get; set; }
    public string CrisisName { get; set; } = string.Empty;
    public decimal? CrisisLatitude { get; set; }
    public decimal? CrisisLongitude { get; set; }

    public int? CitizenRequestId { get; set; }
    public decimal? CitizenRequestLatitude { get; set; }
    public decimal? CitizenRequestLongitude { get; set; }

    public decimal QuantityRequested { get; set; }
    public decimal QuantityAllocated { get; set; }

    public string Status { get; set; } = string.Empty;

    public int RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;

    public int? ApprovedByUserId { get; set; }
    public string? ApprovedByUserName { get; set; }

    public string? ReferenceNumber { get; set; }
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
