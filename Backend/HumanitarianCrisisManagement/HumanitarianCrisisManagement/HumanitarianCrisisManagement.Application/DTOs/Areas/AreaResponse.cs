
namespace HumanitarianCrisisManagement.Application.DTOs.Areas;

public class AreaResponse
{
    public int AreaId { get; set; }

    public string AreaName { get; set; } = string.Empty;

    public string AreaType { get; set; } = string.Empty;

    public int? ParentAreaId { get; set; }

    public string? ParentAreaName { get; set; }

    public string? Code { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public bool IsActive { get; set; }
}
