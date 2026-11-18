using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;

public class UpdateCitizenRequest
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string RequestType { get; set; } = string.Empty;

    [Required]
    [StringLength(4000, MinimumLength = 5)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression("Low|Medium|High|Critical")]
    public string UrgencyLevel { get; set; } = "Medium";

    [Range(1, 1000)]
    public int PeopleCount { get; set; } = 1;

    [Required]
    public int AreaId { get; set; }

    public int? CrisisId { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    [Range(-90, 90)]
    public decimal? Latitude { get; set; }

    [Range(-180, 180)]
    public decimal? Longitude { get; set; }
}