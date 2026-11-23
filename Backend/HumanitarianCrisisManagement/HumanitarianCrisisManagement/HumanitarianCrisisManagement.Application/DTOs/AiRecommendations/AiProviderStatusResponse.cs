namespace HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;

public class AiProviderStatusResponse
{
    public bool IsConfigured { get; set; }

    public string ProviderName { get; set; } = "None";

    public string Status { get; set; } = "Unavailable";

    public string Message { get; set; } = string.Empty;
}
