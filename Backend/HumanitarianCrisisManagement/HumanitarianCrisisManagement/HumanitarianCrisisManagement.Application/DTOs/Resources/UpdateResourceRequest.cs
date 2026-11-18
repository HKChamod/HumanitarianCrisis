using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Resources;

public class UpdateResourceRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string ResourceName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string ResourceCategory { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Description { get; set; }

    [Required]
    [StringLength(30, MinimumLength = 1)]
    public string UnitOfMeasure { get; set; } = string.Empty;

    public bool IsPerishable { get; set; }

    public bool IsActive { get; set; } = true;
}