namespace HumanitarianCrisisManagement.Domain.Entities;

public class CitizenRequest
{
    public int RequestId { get; set; }

    public int UserId { get; set; }

    public int? CrisisId { get; set; }

    public int AreaId { get; set; }

    public string RequestType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string UrgencyLevel { get; set; } = "Medium";

    public int PeopleCount { get; set; } = 1;

    public string Status { get; set; } = "Pending";

    public string? Address { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;

    public CrisisEvent? CrisisEvent { get; set; }

    public Area Area { get; set; } = null!;
}
