using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;

public class ReviewAiRecommendationRequest
{
    [Required]
    [RegularExpression("^(Approved|Overridden|Rejected)$", ErrorMessage = "Decision must be Approved, Overridden, or Rejected.")]
    public string Decision { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? HumanDecisionNote { get; set; }

    [StringLength(50)]
    public string? OverriddenCategory { get; set; }

    [RegularExpression("^(Low|Medium|High|Critical)$", ErrorMessage = "OverriddenUrgencyLevel must be Low, Medium, High, or Critical.")]
    public string? OverriddenUrgencyLevel { get; set; }
}
