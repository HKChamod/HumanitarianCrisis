using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;

public class TransferInventoryRequest
{
    [Range(1, int.MaxValue)]
    public int SourceInventoryId { get; set; }

    [Range(1, int.MaxValue)]
    public int DestinationInventoryId { get; set; }

    [Range(typeof(decimal), "0.01", "9999999999999999")]
    public decimal Quantity { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}
