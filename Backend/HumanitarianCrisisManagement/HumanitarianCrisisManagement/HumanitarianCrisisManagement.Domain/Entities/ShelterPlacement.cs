namespace HumanitarianCrisisManagement.Domain.Entities;

public class ShelterPlacement
{
    public int PlacementId { get; set; }
    public int ShelterId { get; set; }
    public Shelter Shelter { get; set; } = null!;
    public int? CitizenRequestId { get; set; }
    public CitizenRequest? CitizenRequest { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public int PeopleCount { get; set; } = 1;
    public string Status { get; set; } = "Active"; // Active, CheckedOut
    public string? Notes { get; set; }
    public int? AssignedByUserId { get; set; }
    public User? AssignedByUser { get; set; }
    public DateTime CheckedInAt { get; set; } = DateTime.UtcNow;
    public DateTime? CheckedOutAt { get; set; }
}
