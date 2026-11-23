
using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Areas;

public class UpdateAreaRequest
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

    public bool IsActive { get; set; } = true;
}
