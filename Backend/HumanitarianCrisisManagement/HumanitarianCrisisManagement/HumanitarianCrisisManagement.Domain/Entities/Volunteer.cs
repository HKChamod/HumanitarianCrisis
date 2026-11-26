namespace HumanitarianCrisisManagement.Domain.Entities;

public class Volunteer
{
    public int VolunteerId { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public int? AreaId { get; set; }
    public Area? Area { get; set; }
    public string Skills { get; set; } = string.Empty;
    public string AvailabilityStatus { get; set; } = "Available"; // Available, Deployed, Unavailable
    public string ApprovalStatus { get; set; } = "Pending"; // Pending, Approved, Rejected
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<VolunteerAssignment> Assignments { get; set; } = new List<VolunteerAssignment>();
}
