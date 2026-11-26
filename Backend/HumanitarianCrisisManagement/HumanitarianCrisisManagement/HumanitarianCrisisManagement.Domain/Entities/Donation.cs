namespace HumanitarianCrisisManagement.Domain.Entities;

public class Donation
{
    public int DonationId { get; set; }
    public string DonorName { get; set; } = string.Empty;
    public string? DonorEmail { get; set; }
    public string? DonorPhone { get; set; }
    public int? DonorUserId { get; set; }
    public User? DonorUser { get; set; }
    public string DonationType { get; set; } = "Monetary"; // Monetary, Resource
    public decimal? Amount { get; set; }
    public string Currency { get; set; } = "LKR";
    public int? ResourceId { get; set; }
    public Resource? Resource { get; set; }
    public int? WarehouseId { get; set; }
    public Warehouse? Warehouse { get; set; }
    public decimal? Quantity { get; set; }
    public int? InventoryTransactionId { get; set; }
    public InventoryTransaction? InventoryTransaction { get; set; }
    public int? CrisisId { get; set; }
    public CrisisEvent? Crisis { get; set; }
    public string? ReferenceNumber { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, Verified, Completed, Rejected
    public int? VerifiedByUserId { get; set; }
    public User? VerifiedByUser { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
