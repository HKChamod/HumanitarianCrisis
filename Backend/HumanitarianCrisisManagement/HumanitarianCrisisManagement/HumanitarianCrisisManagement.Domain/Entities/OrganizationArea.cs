namespace HumanitarianCrisisManagement.Domain.Entities;

public class OrganizationArea
{
    public int OrganizationAreaId { get; set; }

    public int OrganizationId { get; set; }

    public int AreaId { get; set; }

    // Active, Standby, Completed
    public string AssignmentStatus { get; set; } = "Active";

    public string? PrimaryContact { get; set; }

    public string? Notes { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public int? AssignedByUserId { get; set; }

    // Navigation properties
    public Organization Organization { get; set; } = null!;

    public Area Area { get; set; } = null!;

    public User? AssignedByUser { get; set; }
}
