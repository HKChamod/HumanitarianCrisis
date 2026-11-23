namespace HumanitarianCrisisManagement.Application.Interfaces;

public sealed record AiSanitizedTextResult(
    bool Included,
    string? SanitizedText,
    int RedactionCount,
    string? OmissionReason = null);

public interface IAiTextPrivacySanitizer
{
    AiSanitizedTextResult SanitizeFreeText(string? rawText, int maxLength);
}
