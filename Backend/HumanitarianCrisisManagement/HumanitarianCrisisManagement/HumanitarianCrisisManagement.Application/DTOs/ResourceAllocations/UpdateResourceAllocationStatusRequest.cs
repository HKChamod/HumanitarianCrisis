using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;

public class UpdateResourceAllocationStatusRequest
{
    [Range(typeof(decimal), "0.01", "9999999999999999")]
    public decimal? QuantityAllocated { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}
