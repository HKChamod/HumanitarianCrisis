using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.WarehouseInventories;

public class CreateWarehouseInventoryRequest
{
    [Range(1, int.MaxValue)]
    public int WarehouseId { get; set; }

    [Range(1, int.MaxValue)]
    public int ResourceId { get; set; }

    [Range(0, double.MaxValue)]
    public decimal ReorderLevel { get; set; }
}