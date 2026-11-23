namespace HumanitarianCrisisManagement.Domain.Entities;

public class VolunteerAssignment
{
    public int AssignmentId { get; set; }
    public int VolunteerId { get; set; }
    public Volunteer Volunteer { get; set; } = null!;
    public int CrisisId { get; set; }
    public CrisisEvent Crisis { get; set; } = null!;
    public string RoleTitle { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public string Status { get; set; } = "Assigned"; // Assigned, Active, Completed, Cancelled
    public int AssignedByUserId { get; set; }
    public User AssignedByUser { get; set; } = null!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
}
