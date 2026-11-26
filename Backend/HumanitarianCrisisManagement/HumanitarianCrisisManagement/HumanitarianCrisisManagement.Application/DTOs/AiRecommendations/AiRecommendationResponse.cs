namespace HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;

public class AiRecommendationResponse
{
    public int RecommendationId { get; set; }

    // Verified operational facts from database
    public int CitizenRequestId { get; set; }
    public string CurrentRequestType { get; set; } = string.Empty;
    public string CurrentUrgencyLevel { get; set; } = string.Empty;
    public string CurrentRequestStatus { get; set; } = string.Empty;
    public string AreaName { get; set; } = string.Empty;
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public int? CrisisId { get; set; }
    public string? CrisisName { get; set; }

    // AI advisory suggestions (distinct from verified facts)
    public string SuggestedCategory { get; set; } = string.Empty;
    public string SuggestedUrgencyLevel { get; set; } = string.Empty;
    public bool IsPotentialDuplicate { get; set; }
    public int? DuplicateOfRequestId { get; set; }
    public int? SuggestedInventoryId { get; set; }
    public string? SuggestedWarehouseName { get; set; }
    public string? SuggestedResourceName { get; set; }
    public decimal? SuggestedInventoryAvailableQuantity { get; set; }
    public decimal? SuggestedResourceQuantity { get; set; }
    public decimal ConfidenceScore { get; set; }
    public string Explanation { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public string? ModelVersion { get; set; }

    // Human-in-the-loop review decision
    public string ReviewStatus { get; set; } = string.Empty;
    public int? ReviewedByUserId { get; set; }
    public string? ReviewedByUserName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? HumanDecisionNote { get; set; }
    public string? OverriddenCategory { get; set; }
    public string? OverriddenUrgencyLevel { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
