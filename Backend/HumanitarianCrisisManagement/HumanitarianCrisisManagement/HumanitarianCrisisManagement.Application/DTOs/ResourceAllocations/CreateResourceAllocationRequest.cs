using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;

public class CreateResourceAllocationRequest
{
    [Range(1, int.MaxValue)]
    public int InventoryId { get; set; }

    [Range(1, int.MaxValue)]
    public int CrisisId { get; set; }

    [Range(typeof(decimal), "0.01", "9999999999999999")]
    public decimal QuantityRequested { get; set; }

    [StringLength(100)]
    public string? ReferenceNumber { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
