using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Application.Exceptions;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class AiDecisionSupportService : IAiDecisionSupportService
{
    private const int MaxCategoryLength = 100;
    private const int MaxExplanationLength = 2000;
    private static readonly string[] ValidUrgencyLevels = ["Low", "Medium", "High", "Critical"];

    private readonly ApplicationDbContext _context;
    private readonly IAiAnalysisProvider _aiProvider;
    private readonly IAuditLogService? _auditLogService;

    public AiDecisionSupportService(
        ApplicationDbContext context,
        IAiAnalysisProvider aiProvider,
        IAuditLogService? auditLogService = null)
    {
        _context = context;
        _aiProvider = aiProvider;
        _auditLogService = auditLogService;
    }

    public AiProviderStatusResponse GetProviderStatus()
    {
        if (_aiProvider.IsConfigured)
        {
            return new AiProviderStatusResponse
            {
                IsConfigured = true,
                ProviderName = _aiProvider.ProviderName,
                Status = "Available",
                Message = $"AI Decision Support is active using provider '{_aiProvider.ProviderName}'."
            };
        }

        return new AiProviderStatusResponse
        {
            IsConfigured = false,
            ProviderName = _aiProvider.ProviderName,
            Status = "Unavailable",
            Message = "No AI provider is configured. AI analysis is unavailable until an AI provider is registered."
        };
    }

    public Task<AiProviderDiagnosticResponse> RunProviderDiagnosticAsync(
        CancellationToken cancellationToken = default)
    {
        if (!_aiProvider.IsConfigured)
        {
            throw new AiProviderUnavailableException(
                "No AI analysis provider is configured. Configure an AI provider to run connectivity diagnostics.");
        }

        // Pure provider-level connectivity diagnostic: performs zero database reads or writes.
        return _aiProvider.RunConnectivityDiagnosticAsync(cancellationToken);
    }

    public async Task<AiRecommendationResponse> AnalyzeCitizenRequestAsync(
        int citizenRequestId,
        CancellationToken cancellationToken = default)
    {
        if (!_aiProvider.IsConfigured)
        {
            throw new AiProviderUnavailableException(
                "No AI analysis provider is configured. Configure an AI provider to generate live citizen request recommendations.");
        }

        var citizenRequest = await _context.CitizenRequests
            .AsNoTracking()
            .Include(r => r.Area)
            .Include(r => r.CrisisEvent)
            .FirstOrDefaultAsync(r => r.RequestId == citizenRequestId, cancellationToken);

        if (citizenRequest == null)
            throw new KeyNotFoundException("Citizen request not found.");

        var recentAreaRequests = await _context.CitizenRequests
            .AsNoTracking()
            .Where(r => r.AreaId == citizenRequest.AreaId && r.RequestId != citizenRequest.RequestId)
            .OrderByDescending(r => r.CreatedAt)
            .Take(20)
            .Select(r => new AiSiblingRequestSnapshot
            {
                RequestId = r.RequestId,
                RequestType = r.RequestType,
                Description = r.Description,
                Status = r.Status,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var availableInventories = await _context.WarehouseInventories
            .AsNoTracking()
            .Include(i => i.Warehouse)
            .Include(i => i.Resource)
            .Where(i => i.QuantityAvailable > 0 && i.Warehouse.IsActive && i.Resource.IsActive)
            .OrderByDescending(i => i.QuantityAvailable)
            .Take(50)
            .Select(i => new AiAvailableInventorySnapshot
            {
                InventoryId = i.InventoryId,
                WarehouseId = i.WarehouseId,
                WarehouseName = i.Warehouse.WarehouseName,
                ResourceId = i.ResourceId,
                ResourceName = i.Resource.ResourceName,
                ResourceCategory = i.Resource.ResourceCategory,
                QuantityAvailable = i.QuantityAvailable
            })
            .ToListAsync(cancellationToken);

        var analysisContext = new AiAnalysisContext
        {
            CitizenRequestId = citizenRequest.RequestId,
            RequestType = citizenRequest.RequestType,
            Description = citizenRequest.Description,
            CurrentUrgencyLevel = citizenRequest.UrgencyLevel,
            PeopleCount = citizenRequest.PeopleCount,
            AreaId = citizenRequest.AreaId,
            AreaName = citizenRequest.Area.AreaName,
            Address = citizenRequest.Address,
            CrisisId = citizenRequest.CrisisId,
            CrisisName = citizenRequest.CrisisEvent?.CrisisName,
            CrisisType = citizenRequest.CrisisEvent?.CrisisType,
            CrisisSeverityLevel = citizenRequest.CrisisEvent?.SeverityLevel,
            RecentAreaRequests = recentAreaRequests,
            AvailableInventories = availableInventories
        };

        var result = await _aiProvider.AnalyzeCitizenRequestAsync(analysisContext, cancellationToken);

        // Validate AI provider output against real database facts (prevent hallucinated IDs or stock)
        if (string.IsNullOrWhiteSpace(result.SuggestedCategory))
            throw new InvalidOperationException("AI provider returned an empty suggested category.");

        var trimmedCategory = result.SuggestedCategory.Trim();
        if (trimmedCategory.Length > MaxCategoryLength || trimmedCategory.All(char.IsDigit))
            throw new InvalidOperationException("AI provider returned an invalid or oversized suggested category.");

        if (!ValidUrgencyLevels.Contains(result.SuggestedUrgencyLevel, StringComparer.Ordinal))
            throw new InvalidOperationException("AI provider returned an invalid suggested urgency level.");

        if (result.ConfidenceScore < 0m || result.ConfidenceScore > 1m)
            throw new InvalidOperationException("AI provider confidence score must be between 0.0 and 1.0.");

        if (string.IsNullOrWhiteSpace(result.Explanation))
            throw new InvalidOperationException("AI provider must return a non-empty explanation.");

        var trimmedExplanation = result.Explanation.Trim();
        if (trimmedExplanation.Length > MaxExplanationLength)
            throw new InvalidOperationException("AI provider explanation exceeds maximum allowed length.");

        if (result.DuplicateOfRequestId.HasValue && result.DuplicateOfRequestId.Value <= 0)
            throw new InvalidOperationException("AI provider returned an invalid non-positive duplicate request ID.");

        if (result.SuggestedInventoryId.HasValue && result.SuggestedInventoryId.Value <= 0)
            throw new InvalidOperationException("AI provider returned an invalid non-positive inventory ID.");

        if (result.SuggestedResourceQuantity.HasValue && result.SuggestedResourceQuantity.Value <= 0m)
            throw new InvalidOperationException("AI provider returned an invalid non-positive resource quantity.");

        if (!result.SuggestedInventoryId.HasValue && result.SuggestedResourceQuantity.HasValue)
            throw new InvalidOperationException("AI provider returned a resource quantity without a suggested inventory ID.");

        int? validatedDuplicateId = null;
        if (result.IsPotentialDuplicate && result.DuplicateOfRequestId.HasValue)
        {
            var duplicateExists = recentAreaRequests.Any(r => r.RequestId == result.DuplicateOfRequestId.Value);
            if (duplicateExists)
            {
                validatedDuplicateId = result.DuplicateOfRequestId.Value;
            }
        }

        int? validatedInventoryId = null;
        decimal? validatedQuantity = null;
        if (result.SuggestedInventoryId.HasValue)
        {
            var matchedInv = availableInventories.FirstOrDefault(i => i.InventoryId == result.SuggestedInventoryId.Value);
            if (matchedInv != null && result.SuggestedResourceQuantity.HasValue && result.SuggestedResourceQuantity.Value > 0)
            {
                validatedInventoryId = matchedInv.InventoryId;
                validatedQuantity = Math.Min(result.SuggestedResourceQuantity.Value, matchedInv.QuantityAvailable);
            }
        }

        // Persist advisory recommendation only; NEVER mutate CitizenRequest.Status automatically
        var entity = new AiRecommendation
        {
            CitizenRequestId = citizenRequest.RequestId,
            CrisisId = citizenRequest.CrisisId,
            SuggestedCategory = trimmedCategory,
            SuggestedUrgencyLevel = result.SuggestedUrgencyLevel.Trim(),
            IsPotentialDuplicate = result.IsPotentialDuplicate && validatedDuplicateId.HasValue,
            DuplicateOfRequestId = validatedDuplicateId,
            SuggestedInventoryId = validatedInventoryId,
            SuggestedResourceQuantity = validatedQuantity,
            ConfidenceScore = result.ConfidenceScore,
            Explanation = trimmedExplanation,
            ProviderName = string.IsNullOrWhiteSpace(result.ProviderName)
                ? _aiProvider.ProviderName
                : result.ProviderName.Trim(),
            ModelVersion = result.ModelVersion?.Trim(),
            ReviewStatus = AiRecommendationReviewStatus.PendingReview,
            CreatedAt = DateTime.UtcNow
        };

        _context.AiRecommendations.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        if (_auditLogService != null)
        {
            await _auditLogService.RecordAsync(
                null,
                null,
                "AiRecommendation.Generated",
                "AiRecommendation",
                entity.RecommendationId.ToString(),
                $"Generated advisory AI recommendation #{entity.RecommendationId} for CitizenRequest #{entity.CitizenRequestId} via {entity.ProviderName}.");
        }

        return await GetByIdAsync(entity.RecommendationId);
    }

    public async Task<IReadOnlyList<AiRecommendationResponse>> GetAllAsync(
        string? reviewStatus = null,
        int? citizenRequestId = null)
    {
        var query = BuildDetailQuery();

        if (citizenRequestId.HasValue)
        {
            query = query.Where(r => r.CitizenRequestId == citizenRequestId.Value);
        }

        if (!string.IsNullOrWhiteSpace(reviewStatus))
        {
            if (!Enum.TryParse<AiRecommendationReviewStatus>(reviewStatus.Trim(), true, out var parsedStatus))
            {
                throw new ArgumentException($"Invalid reviewStatus filter '{reviewStatus}'.");
            }

            query = query.Where(r => r.ReviewStatus == parsedStatus);
        }

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return items.Select(MapToResponse).ToList();
    }

    public async Task<AiRecommendationResponse> GetByIdAsync(int recommendationId)
    {
        var item = await BuildDetailQuery()
            .FirstOrDefaultAsync(r => r.RecommendationId == recommendationId);

        if (item == null)
            throw new KeyNotFoundException("AI recommendation not found.");

        return MapToResponse(item);
    }

    public async Task<AiRecommendationResponse> ReviewAsync(
        int recommendationId,
        ReviewAiRecommendationRequest request,
        int reviewerUserId)
    {
        var recommendation = await _context.AiRecommendations
            .FirstOrDefaultAsync(r => r.RecommendationId == recommendationId);

        if (recommendation == null)
            throw new KeyNotFoundException("AI recommendation not found.");

        if (recommendation.ReviewStatus != AiRecommendationReviewStatus.PendingReview)
        {
            throw new InvalidOperationException(
                $"AI recommendation #{recommendationId} has already been reviewed ({recommendation.ReviewStatus}) and cannot be reviewed again.");
        }

        var reviewerExists = await _context.Users
            .AnyAsync(u => u.UserId == reviewerUserId && u.IsActive);

        if (!reviewerExists)
            throw new UnauthorizedAccessException("Active reviewer account not found.");

        var trimmedDecision = request.Decision?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(trimmedDecision) ||
            int.TryParse(trimmedDecision, out _) ||
            !Enum.TryParse<AiRecommendationReviewStatus>(trimmedDecision, false, out var targetStatus) ||
            targetStatus == AiRecommendationReviewStatus.PendingReview)
        {
            throw new ArgumentException("Decision must be Approved, Overridden, or Rejected.");
        }

        if (targetStatus == AiRecommendationReviewStatus.Overridden)
        {
            if (string.IsNullOrWhiteSpace(request.OverriddenCategory) &&
                string.IsNullOrWhiteSpace(request.OverriddenUrgencyLevel))
            {
                throw new ArgumentException(
                    "Overriding a recommendation requires at least an OverriddenCategory or OverriddenUrgencyLevel.");
            }

            if (!string.IsNullOrWhiteSpace(request.OverriddenCategory) &&
                request.OverriddenCategory.Trim().Length > MaxCategoryLength)
            {
                throw new ArgumentException($"OverriddenCategory cannot exceed {MaxCategoryLength} characters.");
            }

            if (!string.IsNullOrWhiteSpace(request.OverriddenUrgencyLevel) &&
                !ValidUrgencyLevels.Contains(request.OverriddenUrgencyLevel.Trim(), StringComparer.Ordinal))
            {
                throw new ArgumentException("OverriddenUrgencyLevel must be Low, Medium, High, or Critical.");
            }
        }

        recommendation.ReviewStatus = targetStatus;
        recommendation.ReviewedByUserId = reviewerUserId;
        recommendation.ReviewedAt = DateTime.UtcNow;
        recommendation.HumanDecisionNote = string.IsNullOrWhiteSpace(request.HumanDecisionNote)
            ? null
            : request.HumanDecisionNote.Trim();
        recommendation.OverriddenCategory = targetStatus == AiRecommendationReviewStatus.Overridden
            ? request.OverriddenCategory?.Trim()
            : null;
        recommendation.OverriddenUrgencyLevel = targetStatus == AiRecommendationReviewStatus.Overridden
            ? request.OverriddenUrgencyLevel?.Trim()
            : null;
        recommendation.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.RecordAsync(
                reviewerUserId,
                null,
                $"AiRecommendation.{targetStatus}",
                "AiRecommendation",
                recommendation.RecommendationId.ToString(),
                $"Reviewed AI recommendation #{recommendation.RecommendationId} for CitizenRequest #{recommendation.CitizenRequestId}: {targetStatus}.");
        }

        return await GetByIdAsync(recommendationId);
    }

    private IQueryable<AiRecommendation> BuildDetailQuery()
    {
        return _context.AiRecommendations
            .AsNoTracking()
            .Include(r => r.CitizenRequest)
                .ThenInclude(cr => cr.Area)
            .Include(r => r.CrisisEvent)
            .Include(r => r.SuggestedInventory)
                .ThenInclude(i => i!.Warehouse)
            .Include(r => r.SuggestedInventory)
                .ThenInclude(i => i!.Resource)
            .Include(r => r.ReviewedByUser);
    }

    private static AiRecommendationResponse MapToResponse(AiRecommendation item)
    {
        return new AiRecommendationResponse
        {
            RecommendationId = item.RecommendationId,
            CitizenRequestId = item.CitizenRequestId,
            CurrentRequestType = item.CitizenRequest.RequestType,
            CurrentUrgencyLevel = item.CitizenRequest.UrgencyLevel,
            CurrentRequestStatus = item.CitizenRequest.Status,
            AreaName = item.CitizenRequest.Area.AreaName,
            Latitude = item.CitizenRequest.Latitude,
            Longitude = item.CitizenRequest.Longitude,
            CrisisId = item.CrisisId,
            CrisisName = item.CrisisEvent?.CrisisName,
            SuggestedCategory = item.SuggestedCategory,
            SuggestedUrgencyLevel = item.SuggestedUrgencyLevel,
            IsPotentialDuplicate = item.IsPotentialDuplicate,
            DuplicateOfRequestId = item.DuplicateOfRequestId,
            SuggestedInventoryId = item.SuggestedInventoryId,
            SuggestedWarehouseName = item.SuggestedInventory?.Warehouse.WarehouseName,
            SuggestedResourceName = item.SuggestedInventory?.Resource.ResourceName,
            SuggestedInventoryAvailableQuantity = item.SuggestedInventory?.QuantityAvailable,
            SuggestedResourceQuantity = item.SuggestedResourceQuantity,
            ConfidenceScore = item.ConfidenceScore,
            Explanation = item.Explanation,
            ProviderName = item.ProviderName,
            ModelVersion = item.ModelVersion,
            ReviewStatus = item.ReviewStatus.ToString(),
            ReviewedByUserId = item.ReviewedByUserId,
            ReviewedByUserName = item.ReviewedByUser?.FullName,
            ReviewedAt = item.ReviewedAt,
            HumanDecisionNote = item.HumanDecisionNote,
            OverriddenCategory = item.OverriddenCategory,
            OverriddenUrgencyLevel = item.OverriddenUrgencyLevel,
            CreatedAt = item.CreatedAt,
            UpdatedAt = item.UpdatedAt
        };
    }
}
