
namespace HumanitarianCrisisManagement.Domain.Entities;

public class Area
{
    public int AreaId { get; set; }

    public string AreaName { get; set; } = string.Empty;

    // Province, District, DS Division, GN Division, Custom
    public string AreaType { get; set; } = string.Empty;

    // Supports hierarchical geographical areas
    public int? ParentAreaId { get; set; }

    public string? Code { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public bool IsActive { get; set; } = true;

    // Self-referencing relationship
    public Area? ParentArea { get; set; }

    public ICollection<Area> ChildAreas { get; set; }
        = new List<Area>();
    public ICollection<CitizenRequest> CitizenRequests { get; set; }
    = new List<CitizenRequest>();
}
