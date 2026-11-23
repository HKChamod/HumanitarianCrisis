using System.Diagnostics;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;
using Xunit.Abstractions;

namespace HumanitarianCrisisManagement.Tests;

/// <summary>
/// Opt-in synthetic validation harness for the live Groq AI provider (openai/gpt-oss-120b).
/// - Completely skipped (no live HTTP calls) during ordinary `dotnet test` runs.
/// - Activated ONLY when environment variable HCMS_RUN_LIVE_GROQ_SYNTHETIC=true.
/// - Never connects to SQL Server, never reads/writes CitizenRequests, never prints API keys,
///   never falls back to Gemini, and strictly preserves IncludeSanitizedDescriptions=false.
/// </summary>
public class LiveGroqSyntheticValidationTests
{
    private const string OptInEnvVar = "HCMS_RUN_LIVE_GROQ_SYNTHETIC";
    private const string ApiUserSecretsId = "4d636a6b-5d48-4a77-986c-3dbc48f26a5c";
    private static readonly string[] ValidUrgencyLevels = ["Low", "Medium", "High", "Critical"];

    private readonly ITestOutputHelper _output;

    public LiveGroqSyntheticValidationTests(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public void SyntheticScenarios_AreWellFormedAndUseStrictlyArtificialIds()
    {
        Assert.True(SyntheticGroqScenarios.All.Count >= 5);
        foreach (var scenario in SyntheticGroqScenarios.All)
        {
            Assert.True(scenario.Context.CitizenRequestId >= 90000);
            Assert.Contains("Synthetic", scenario.Context.AreaName, StringComparison.OrdinalIgnoreCase);
            Assert.NotEmpty(scenario.ExpectedUrgencyLevels);
        }
    }

    [Fact]
    [Trait("Category", "LiveGroqSynthetic")]
    public async Task RunLiveGroqSyntheticValidationHarness_OptInOnly()
    {
        if (!string.Equals(Environment.GetEnvironmentVariable(OptInEnvVar), "true", StringComparison.OrdinalIgnoreCase))
        {
            _output.WriteLine($"SKIPPED: Set {OptInEnvVar}=true to execute live Groq synthetic validation.");
            return;
        }

        var groqApiKey = ResolveGroqApiKeyWithoutLogging();
        Assert.False(
            string.IsNullOrWhiteSpace(groqApiKey),
            "AiProvider:GroqApiKey is not configured in User Secrets or environment variables.");

        var options = new AiProviderOptions
        {
            Provider = AiProviderOptions.GroqProviderName,
            GroqApiKey = groqApiKey,
            GroqModel = AiProviderOptions.DefaultGroqModel,
            GroqBaseUrl = AiProviderOptions.DefaultGroqBaseUrl,
            TimeoutSeconds = AiProviderOptions.DefaultTimeoutSeconds,
            IncludeSanitizedDescriptions = false // Strict privacy mode preserved
        };

        Assert.True(options.IsGroqConfigured);
        Assert.False(options.IsGeminiConfigured);
        Assert.False(options.IncludeSanitizedDescriptions);

        using var httpClient = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        var provider = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(options),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        var results = new List<object>();

        foreach (var scenario in SyntheticGroqScenarios.All)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                var ai = await provider.AnalyzeCitizenRequestAsync(scenario.Context);
                sw.Stop();

                var urgencyValid = ValidUrgencyLevels.Contains(ai.SuggestedUrgencyLevel, StringComparer.Ordinal);
                var confidenceValid = ai.ConfidenceScore >= 0m && ai.ConfidenceScore <= 1m;
                var categoryValid = !string.IsNullOrWhiteSpace(ai.SuggestedCategory);
                var explanationValid = !string.IsNullOrWhiteSpace(ai.Explanation);
                var duplicateIdValid = !ai.DuplicateOfRequestId.HasValue ||
                    scenario.Context.RecentAreaRequests.Any(r => r.RequestId == ai.DuplicateOfRequestId.Value);
                var inventoryValid = !ai.SuggestedInventoryId.HasValue ||
                    scenario.Context.AvailableInventories.Any(i =>
                        i.InventoryId == ai.SuggestedInventoryId.Value &&
                        ai.SuggestedResourceQuantity.HasValue &&
                        ai.SuggestedResourceQuantity.Value > 0m &&
                        ai.SuggestedResourceQuantity.Value <= i.QuantityAvailable);

                var serverValidationPassed = urgencyValid && confidenceValid && categoryValid &&
                    explanationValid && duplicateIdValid && inventoryValid;

                var urgencyMatchesExpectation = scenario.ExpectedUrgencyLevels
                    .Contains(ai.SuggestedUrgencyLevel, StringComparer.OrdinalIgnoreCase);

                Assert.True(serverValidationPassed, $"{scenario.ScenarioId} failed server-side validation.");

                results.Add(new
                {
                    scenarioId = scenario.ScenarioId,
                    title = scenario.Title,
                    status = "PASS",
                    latencyMs = sw.ElapsedMilliseconds,
                    provider = ai.ProviderName,
                    model = ai.ModelVersion,
                    suggestedCategory = ai.SuggestedCategory,
                    suggestedUrgencyLevel = ai.SuggestedUrgencyLevel,
                    urgencyMatchesExpected = urgencyMatchesExpectation,
                    expectedUrgencyLevels = scenario.ExpectedUrgencyLevels,
                    confidenceScore = ai.ConfidenceScore,
                    isPotentialDuplicate = ai.IsPotentialDuplicate,
                    duplicateOfRequestId = ai.DuplicateOfRequestId,
                    expectDuplicateSignal = scenario.ExpectDuplicateSignal,
                    suggestedInventoryId = ai.SuggestedInventoryId,
                    suggestedResourceQuantity = ai.SuggestedResourceQuantity,
                    schemaAndServerValidationPassed = serverValidationPassed,
                    explanation = ai.Explanation
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                var safeError = ex.Message.Replace(groqApiKey, "[REDACTED_KEY]", StringComparison.Ordinal);
                results.Add(new
                {
                    scenarioId = scenario.ScenarioId,
                    title = scenario.Title,
                    status = "FAIL",
                    latencyMs = sw.ElapsedMilliseconds,
                    errorType = ex.GetType().Name,
                    errorMessage = safeError
                });
                throw;
            }
        }

        var reportJson = JsonSerializer.Serialize(new
        {
            generatedAtUtc = DateTime.UtcNow,
            provider = options.Provider,
            model = options.GetEffectiveGroqModel(),
            endpoint = $"{options.GetEffectiveGroqBaseUrl()}/chat/completions",
            includeSanitizedDescriptions = options.IncludeSanitizedDescriptions,
            databaseAccessed = false,
            persistedRecords = 0,
            scenariosExecuted = results.Count,
            results
        }, new JsonSerializerOptions { WriteIndented = true });

        _output.WriteLine("=== SYNTHETIC GROQ VALIDATION REPORT JSON ===");
        _output.WriteLine(reportJson);
    }

    private static string? ResolveGroqApiKeyWithoutLogging()
    {
        var envKey = Environment.GetEnvironmentVariable("AiProvider__GroqApiKey");
        if (!string.IsNullOrWhiteSpace(envKey))
            return envKey.Trim();

        var secretsPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "Microsoft",
            "UserSecrets",
            ApiUserSecretsId,
            "secrets.json");

        if (!File.Exists(secretsPath))
            return null;

        using var doc = JsonDocument.Parse(File.ReadAllText(secretsPath));
        if (doc.RootElement.TryGetProperty("AiProvider:GroqApiKey", out var keyProp) &&
            keyProp.ValueKind == JsonValueKind.String)
        {
            return keyProp.GetString()?.Trim();
        }

        return null;
    }
}
