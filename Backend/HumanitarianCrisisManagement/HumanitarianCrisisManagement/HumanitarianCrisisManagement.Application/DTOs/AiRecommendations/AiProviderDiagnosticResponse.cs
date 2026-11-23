namespace HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;

public class AiProviderDiagnosticResponse
{
    public bool Success { get; set; }
    public string ProviderName { get; set; } = string.Empty;
    public string? Model { get; set; }
    public long ElapsedMs { get; set; }
    public string? ResponseText { get; set; }
    public string Message { get; set; } = string.Empty;
}
