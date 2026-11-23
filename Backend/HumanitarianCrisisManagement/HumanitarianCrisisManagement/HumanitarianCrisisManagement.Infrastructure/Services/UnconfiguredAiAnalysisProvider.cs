using HumanitarianCrisisManagement.Application.Exceptions;
using HumanitarianCrisisManagement.Application.Interfaces;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

/// <summary>
/// Default provider-independent placeholder when no external or local AI provider is configured.
/// Never fabricates mock or hardcoded AI recommendations in live mode.
/// </summary>
public class UnconfiguredAiAnalysisProvider : IAiAnalysisProvider
{
    public bool IsConfigured => false;

    public string ProviderName => "None";

    public Task<AiAnalysisResult> AnalyzeCitizenRequestAsync(
        AiAnalysisContext context,
        CancellationToken cancellationToken = default)
    {
        throw new AiProviderUnavailableException(
            "No AI analysis provider is configured. Configure an AI provider to generate live citizen request recommendations.");
    }
}
