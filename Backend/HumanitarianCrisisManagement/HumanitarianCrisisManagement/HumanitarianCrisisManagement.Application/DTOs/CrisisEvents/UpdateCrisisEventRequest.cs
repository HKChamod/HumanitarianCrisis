using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.CrisisEvents;

public class UpdateCrisisEventRequest
{
    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string CrisisName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string CrisisType { get; set; } = string.Empty;

    [Required]
    [StringLength(4000, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string SeverityLevel { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [StringLength(250)]
    public string? LocationName { get; set; }

    [Range(-90, 90)]
    public decimal? Latitude { get; set; }

    [Range(-180, 180)]
    public decimal? Longitude { get; set; }
}
