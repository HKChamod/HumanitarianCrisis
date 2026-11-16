using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.CrisisEvents;

public class CreateCrisisEventRequest
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
}
