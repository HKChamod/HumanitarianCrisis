using System.ComponentModel.DataAnnotations;
using HumanitarianCrisisManagement.Domain.Enums;

namespace HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;

public class CreateInventoryTransactionRequest
{
    [Range(1, int.MaxValue)]
    public int InventoryId { get; set; }

    [Required]
    public InventoryTransactionType TransactionType { get; set; }

    public decimal Quantity { get; set; }

    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}
