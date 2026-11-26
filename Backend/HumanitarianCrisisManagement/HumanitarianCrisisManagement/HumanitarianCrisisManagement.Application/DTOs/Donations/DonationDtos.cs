using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Donations;

public class DonationResponse
{
    public int DonationId { get; set; }
    public string DonorName { get; set; } = string.Empty;
    public string? DonorEmail { get; set; }
    public string? DonorPhone { get; set; }
    public int? DonorUserId { get; set; }
    public string DonationType { get; set; } = string.Empty;
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public int? ResourceId { get; set; }
    public string? ResourceName { get; set; }
    public int? WarehouseId { get; set; }
    public string? WarehouseName { get; set; }
    public decimal? Quantity { get; set; }
    public int? InventoryTransactionId { get; set; }
    public int? CrisisId { get; set; }
    public string? CrisisName { get; set; }
    public string? ReferenceNumber { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? VerifiedByUserId { get; set; }
    public string? VerifiedByUserName { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateDonationRequest
{
    [Required, MaxLength(200)]
    public string DonorName { get; set; } = string.Empty;
    [EmailAddress, MaxLength(200)]
    public string? DonorEmail { get; set; }
    [MaxLength(40)]
    public string? DonorPhone { get; set; }
    [Required, MaxLength(30)]
    public string DonationType { get; set; } = "Monetary"; // Monetary, Resource
    public decimal? Amount { get; set; }
    [MaxLength(10)]
    public string Currency { get; set; } = "LKR";
    public int? ResourceId { get; set; }
    public int? WarehouseId { get; set; }
    public decimal? Quantity { get; set; }
    public int? CrisisId { get; set; }
    [MaxLength(100)]
    public string? ReferenceNumber { get; set; }
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class VerifyDonationRequest
{
    [Required, MaxLength(30)]
    public string Decision { get; set; } = "Verified"; // Verified, Completed, Rejected
    public int? WarehouseId { get; set; }
    [MaxLength(1000)]
    public string? Notes { get; set; }
}
