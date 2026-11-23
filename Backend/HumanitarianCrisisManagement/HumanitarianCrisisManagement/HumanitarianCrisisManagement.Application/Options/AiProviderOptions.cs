namespace HumanitarianCrisisManagement.Application.Options;

public class AiProviderOptions
{
    public const string SectionName = "AiProvider";
    public const string DefaultProvider = "None";
    public const string GeminiProviderName = "Gemini";
    public const string DefaultGeminiModel = "gemini-3.1-flash-lite";
    public const string DefaultGeminiBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    public const int DefaultTimeoutSeconds = 120;
    public const int MinTimeoutSeconds = 5;
    public const int MaxTimeoutSeconds = 300;

    /// <summary>
    /// Active AI provider name. Supported values: "None" (default) or "Gemini".
    /// </summary>
    public string Provider { get; set; } = DefaultProvider;

    /// <summary>
    /// Google Gemini API key. Supply via User Secrets or environment variables; never commit to source control.
    /// </summary>
    public string? GeminiApiKey { get; set; }

    /// <summary>
    /// Gemini model identifier (for example "gemini-3.1-flash-lite").
    /// </summary>
    public string Model { get; set; } = DefaultGeminiModel;

    /// <summary>
    /// HTTP timeout in seconds for Gemini API requests.
    /// </summary>
    public int TimeoutSeconds { get; set; } = DefaultTimeoutSeconds;

    /// <summary>
    /// Base URL for the official Google Gemini REST API.
    /// </summary>
    public string BaseUrl { get; set; } = DefaultGeminiBaseUrl;

    /// <summary>
    /// Controls whether privacy-sanitized free-text descriptions may be sent to external AI providers.
    /// Defaults to false (strict mode): free-text descriptions are omitted and only structured operational fields are sent.
    /// When explicitly enabled (true), descriptions pass through <see cref="Interfaces.IAiTextPrivacySanitizer"/>
    /// and are still omitted automatically if residual personal-data risk is detected.
    /// </summary>
    public bool IncludeSanitizedDescriptions { get; set; } = false;

    public bool IsGeminiConfigured =>
        string.Equals(Provider?.Trim(), GeminiProviderName, StringComparison.OrdinalIgnoreCase) &&
        !string.IsNullOrWhiteSpace(GeminiApiKey);

    public string GetEffectiveModel()
    {
        if (string.IsNullOrWhiteSpace(Model))
        {
            return DefaultGeminiModel;
        }

        var normalized = Model.Trim().TrimStart('/');
        const string modelsPrefix = "models/";

        while (normalized.StartsWith(modelsPrefix, StringComparison.OrdinalIgnoreCase))
        {
            normalized = normalized[modelsPrefix.Length..].TrimStart('/');
        }

        normalized = normalized.TrimEnd('/');

        if (string.IsNullOrWhiteSpace(normalized) ||
            string.Equals(normalized, "models", StringComparison.OrdinalIgnoreCase))
        {
            return DefaultGeminiModel;
        }

        return normalized;
    }

    public string GetEffectiveBaseUrl() =>
        string.IsNullOrWhiteSpace(BaseUrl)
            ? DefaultGeminiBaseUrl
            : BaseUrl.Trim().TrimEnd('/');

    public TimeSpan GetEffectiveTimeout()
    {
        var effectiveSeconds = TimeoutSeconds <= 0 ? DefaultTimeoutSeconds : TimeoutSeconds;
        var clampedSeconds = Math.Clamp(effectiveSeconds, MinTimeoutSeconds, MaxTimeoutSeconds);
        return TimeSpan.FromSeconds(clampedSeconds);
    }
}
