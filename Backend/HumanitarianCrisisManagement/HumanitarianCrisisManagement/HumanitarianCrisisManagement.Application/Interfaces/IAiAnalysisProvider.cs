using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public class AiAnalysisContext
{
    public int CitizenRequestId { get; set; }
    public string RequestType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CurrentUrgencyLevel { get; set; } = string.Empty;
    public int PeopleCount { get; set; }
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public int? CrisisId { get; set; }
    public string? CrisisName { get; set; }
    public string? CrisisType { get; set; }
    public string? CrisisSeverityLevel { get; set; }

    public IReadOnlyList<AiSiblingRequestSnapshot> RecentAreaRequests { get; set; } =
        Array.Empty<AiSiblingRequestSnapshot>();

    public IReadOnlyList<AiAvailableInventorySnapshot> AvailableInventories { get; set; } =
        Array.Empty<AiAvailableInventorySnapshot>();
}

public class AiSiblingRequestSnapshot
{
    public int RequestId { get; set; }
    public string RequestType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class AiAvailableInventorySnapshot
{
    public int InventoryId { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int ResourceId { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public string ResourceCategory { get; set; } = string.Empty;
    public decimal QuantityAvailable { get; set; }
}

public class AiAnalysisResult
{
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
}

public interface IAiAnalysisProvider
{
    bool IsConfigured { get; }
    string ProviderName { get; }

    Task<AiAnalysisResult> AnalyzeCitizenRequestAsync(
        AiAnalysisContext context,
        CancellationToken cancellationToken = default);

    Task<AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
        CancellationToken cancellationToken = default);
}
