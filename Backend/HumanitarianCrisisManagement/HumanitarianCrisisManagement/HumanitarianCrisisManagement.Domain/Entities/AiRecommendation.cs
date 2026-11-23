using HumanitarianCrisisManagement.Domain.Enums;

namespace HumanitarianCrisisManagement.Domain.Entities;

public class AiRecommendation
{
    public int RecommendationId { get; set; }

    public int CitizenRequestId { get; set; }

    public int? CrisisId { get; set; }

    // AI-generated advisory suggestions (never automatically applied to CitizenRequest)
    public string SuggestedCategory { get; set; } = string.Empty;

    public string SuggestedUrgencyLevel { get; set; } = string.Empty;

    public bool IsPotentialDuplicate { get; set; }

    public int? DuplicateOfRequestId { get; set; }

    public int? SuggestedInventoryId { get; set; }

    public decimal? SuggestedResourceQuantity { get; set; }

    public decimal ConfidenceScore { get; set; }

    public string Explanation { get; set; } = string.Empty;

    public string ProviderName { get; set; } = string.Empty;

    public string? ModelVersion { get; set; }

    // Human-in-the-loop governance and decision audit fields
    public AiRecommendationReviewStatus ReviewStatus { get; set; } =
        AiRecommendationReviewStatus.PendingReview;

    public int? ReviewedByUserId { get; set; }

    public DateTime? ReviewedAt { get; set; }

    public string? HumanDecisionNote { get; set; }

    public string? OverriddenCategory { get; set; }

    public string? OverriddenUrgencyLevel { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public CitizenRequest CitizenRequest { get; set; } = null!;

    public CrisisEvent? CrisisEvent { get; set; }

    public CitizenRequest? DuplicateOfRequest { get; set; }

    public WarehouseInventory? SuggestedInventory { get; set; }

    public User? ReviewedByUser { get; set; }
}
