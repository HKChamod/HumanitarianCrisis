
namespace HumanitarianCrisisManagement.Application.DTOs.Areas;

public class AreaHierarchyResponse
{
    public int AreaId { get; set; }

    public string AreaName { get; set; } = string.Empty;

    public string AreaType { get; set; } = string.Empty;

    public string? Code { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public bool IsActive { get; set; }

    public List<AreaHierarchyResponse> ChildAreas { get; set; } = new();
}
