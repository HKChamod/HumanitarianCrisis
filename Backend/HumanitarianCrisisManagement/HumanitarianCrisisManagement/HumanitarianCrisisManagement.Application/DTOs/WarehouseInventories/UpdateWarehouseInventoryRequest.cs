using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.WarehouseInventories;

public class UpdateWarehouseInventoryRequest
{
    [Range(0, double.MaxValue)]
    public decimal ReorderLevel { get; set; }
}