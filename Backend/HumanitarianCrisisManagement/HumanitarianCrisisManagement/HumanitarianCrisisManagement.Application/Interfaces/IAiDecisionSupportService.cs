using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IAiDecisionSupportService
{
    AiProviderStatusResponse GetProviderStatus();

    Task<AiRecommendationResponse> AnalyzeCitizenRequestAsync(
        int citizenRequestId,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<AiRecommendationResponse>> GetAllAsync(
        string? reviewStatus = null,
        int? citizenRequestId = null);

    Task<AiRecommendationResponse> GetByIdAsync(int recommendationId);

    Task<AiRecommendationResponse> ReviewAsync(
        int recommendationId,
        ReviewAiRecommendationRequest request,
        int reviewerUserId);
}
