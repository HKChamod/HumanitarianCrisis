
using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Areas;

public class CreateAreaRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string AreaName { get; set; } = string.Empty;

    [Required]
    [RegularExpression(
        "^(Province|District|DS Division|GN Division|Custom)$",
        ErrorMessage = "Invalid area type.")]
    public string AreaType { get; set; } = string.Empty;

    public int? ParentAreaId { get; set; }

    [StringLength(50)]
    public string? Code { get; set; }

    [Range(-90, 90)]
    public decimal? Latitude { get; set; }

    [Range(-180, 180)]
    public decimal? Longitude { get; set; }
}
