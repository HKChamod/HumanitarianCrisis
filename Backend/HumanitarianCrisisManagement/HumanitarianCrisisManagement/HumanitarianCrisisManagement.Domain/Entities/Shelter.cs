namespace HumanitarianCrisisManagement.Domain.Entities;

public class Shelter
{
    public int ShelterId { get; set; }
    public string ShelterName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public Area Area { get; set; } = null!;
    public string Address { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public int Capacity { get; set; }
    public int CurrentOccupancy { get; set; }
    public string Status { get; set; } = "Open"; // Open, Full, Closed, Maintenance
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? Facilities { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<ShelterPlacement> Placements { get; set; } = new List<ShelterPlacement>();
}
