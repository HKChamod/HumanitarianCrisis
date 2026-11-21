using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Warehouses;

public class CreateWarehouseRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string WarehouseName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string WarehouseCode { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [Required]
    [StringLength(500, MinimumLength = 2)]
    public string Address { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int AreaId { get; set; }

    [StringLength(150)]
    public string? ContactPerson { get; set; }

    [StringLength(20)]
    public string? ContactNumber { get; set; }
}