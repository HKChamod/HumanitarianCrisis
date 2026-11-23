using System.Net;
using System.Text;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.Exceptions;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.DependencyInjection;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

public class GeminiAiAnalysisProviderTests
{
    private const string FakeApiKey = "TEST-GEMINI-KEY-DO-NOT-LEAK-98765";

    private static AiAnalysisContext CreateSampleContext() => new()
    {
        CitizenRequestId = 42,
        RequestType = "Medical",
        Description = "Urgent insulin and first-aid kits needed for 5 elderly residents after flooding.",
        CurrentUrgencyLevel = "High",
        PeopleCount = 5,
        AreaId = 2,
        AreaName = "Kalutara South",
        Address = "42 Private Lane, Apt 9B, Secret Street, NIC 901234567V",
        CrisisId = 7,
        CrisisName = "Monsoon Flood 2026",
        CrisisType = "Flood",
        CrisisSeverityLevel = "High",
        RecentAreaRequests =
        [
            new AiSiblingRequestSnapshot
            {
                RequestId = 101,
                RequestType = "Medical",
                Description = "Elderly residents in Kalutara South need insulin urgently.",
                Status = "Pending",
                CreatedAt = new DateTime(2026, 11, 20, 10, 0, 0, DateTimeKind.Utc)
            }
        ],
        AvailableInventories =
        [
            new AiAvailableInventorySnapshot
            {
                InventoryId = 501,
                WarehouseId = 10,
                WarehouseName = "Colombo Central Depot",
                ResourceId = 20,
                ResourceName = "Emergency First-Aid Kit",
                ResourceCategory = "Medical",
                QuantityAvailable = 25m
            }
        ]
    };

    private static AiProviderOptions CreateConfiguredOptions(int timeoutSeconds = 120) => new()
    {
        Provider = "Gemini",
        GeminiApiKey = FakeApiKey,
        Model = "gemini-3.1-flash-lite",
        TimeoutSeconds = timeoutSeconds
    };

    private static HttpResponseMessage BuildGeminiOkEnvelope(object innerRecommendation, string modelVersion = "gemini-3.1-flash-lite-001")
    {
        var innerJson = JsonSerializer.Serialize(innerRecommendation);
        return BuildGeminiRawTextEnvelope(innerJson, modelVersion);
    }

    private static HttpResponseMessage BuildGeminiRawTextEnvelope(string innerText, string modelVersion = "gemini-3.1-flash-lite-001")
    {
        var envelope = new
        {
            candidates = new[]
            {
                new
                {
                    content = new
                    {
                        parts = new[]
                        {
                            new { text = innerText }
                        }
                    }
                }
            },
            modelVersion
        };

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
        };
    }

    [Theory]
    [InlineData("None", null, false)]
    [InlineData("None", FakeApiKey, false)]
    [InlineData("Gemini", null, false)]
    [InlineData("Gemini", "", false)]
    [InlineData("Gemini", "   ", false)]
    [InlineData("Gemini", FakeApiKey, true)]
    [InlineData("gemini", FakeApiKey, true)]
    public void AiProviderOptions_IsGeminiConfigured_ValidatesProviderAndKey(
        string provider,
        string? apiKey,
        bool expectedConfigured)
    {
        var options = new AiProviderOptions
        {
            Provider = provider,
            GeminiApiKey = apiKey
        };

        Assert.Equal(expectedConfigured, options.IsGeminiConfigured);
    }

    [Fact]
    public void DiProviderSelection_FallsBackToUnconfiguredProvider_WhenKeyMissing()
    {
        var services = new ServiceCollection();
        services.Configure<AiProviderOptions>(o =>
        {
            o.Provider = "Gemini";
            o.GeminiApiKey = "";
        });
        services.AddAiAnalysisProviderSelection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var aiProvider = scope.ServiceProvider.GetRequiredService<IAiAnalysisProvider>();

        Assert.IsType<UnconfiguredAiAnalysisProvider>(aiProvider);
        Assert.False(aiProvider.IsConfigured);
        Assert.Equal("None", aiProvider.ProviderName);
    }

    [Fact]
    public void DiProviderSelection_SelectsGeminiProvider_WhenConfigured()
    {
        var services = new ServiceCollection();
        services.Configure<AiProviderOptions>(o =>
        {
            o.Provider = "Gemini";
            o.GeminiApiKey = FakeApiKey;
            o.Model = "gemini-3.1-flash-lite";
        });
        services.AddSingleton(new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)))));
        services.AddLogging();
        services.AddScoped<GeminiAiAnalysisProvider>();
        services.AddAiAnalysisProviderSelection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var aiProvider = scope.ServiceProvider.GetRequiredService<IAiAnalysisProvider>();

        Assert.IsType<GeminiAiAnalysisProvider>(aiProvider);
        Assert.True(aiProvider.IsConfigured);
        Assert.Equal("Gemini", aiProvider.ProviderName);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_ValidStructuredResponse_MapsFieldsAndExcludesPii()
    {
        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;

        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedRequest = req;
            capturedBody = await req.Content!.ReadAsStringAsync(ct);

            return BuildGeminiOkEnvelope(new
            {
                suggestedCategory = "Medical",
                suggestedUrgencyLevel = "Critical",
                isPotentialDuplicate = true,
                duplicateOfRequestId = 101,
                suggestedInventoryId = 501,
                suggestedResourceQuantity = 10.0,
                confidenceScore = 0.915,
                explanation = "Five elderly residents require urgent medical supplies during active flooding."
            });
        });

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.NotNull(capturedRequest);
        Assert.Equal(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
            capturedRequest!.RequestUri!.ToString());
        Assert.DoesNotContain(FakeApiKey, capturedRequest.RequestUri.ToString());
        Assert.True(capturedRequest.Headers.TryGetValues("x-goog-api-key", out var keyValues));
        Assert.Equal(FakeApiKey, Assert.Single(keyValues));

        Assert.NotNull(capturedBody);
        Assert.DoesNotContain("42 Private Lane", capturedBody);
        Assert.DoesNotContain("Secret Street", capturedBody);
        Assert.DoesNotContain("901234567V", capturedBody);
        Assert.DoesNotContain("Urgent insulin and first-aid kits", capturedBody);
        Assert.DoesNotContain("Elderly residents in Kalutara South", capturedBody);
        Assert.Contains("application/json", capturedBody);
        Assert.Contains("Kalutara South", capturedBody);

        Assert.Equal("Medical", result.SuggestedCategory);
        Assert.Equal("Critical", result.SuggestedUrgencyLevel);
        Assert.True(result.IsPotentialDuplicate);
        Assert.Equal(101, result.DuplicateOfRequestId);
        Assert.Equal(501, result.SuggestedInventoryId);
        Assert.Equal(10m, result.SuggestedResourceQuantity);
        Assert.Equal(0.915m, result.ConfidenceScore);
        Assert.Equal("Gemini", result.ProviderName);
        Assert.Equal("gemini-3.1-flash-lite-001", result.ModelVersion);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_MalformedOuterJson_ThrowsInvalidOperationException()
    {
        var handler = new StubHttpMessageHandler((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("not valid json {{{", Encoding.UTF8, "application/json")
        }));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_MalformedInnerJson_ThrowsInvalidOperationException()
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(BuildGeminiRawTextEnvelope("{broken json")));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Theory]
    [InlineData("", "High", "Valid explanation")]
    [InlineData("Medical", "Extreme", "Valid explanation")]
    [InlineData("Medical", "High", "")]
    public async Task AnalyzeCitizenRequestAsync_MissingOrInvalidRequiredFields_ThrowsInvalidOperationException(
        string category,
        string urgency,
        string explanation)
    {
        var handler = new StubHttpMessageHandler((_, _) => Task.FromResult(BuildGeminiOkEnvelope(new
        {
            suggestedCategory = category,
            suggestedUrgencyLevel = urgency,
            isPotentialDuplicate = false,
            confidenceScore = 0.8,
            explanation
        })));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(1.01)]
    [InlineData(5.0)]
    public async Task AnalyzeCitizenRequestAsync_ConfidenceScoreOutOfRange_ThrowsInvalidOperationException(
        double invalidConfidence)
    {
        var handler = new StubHttpMessageHandler((_, _) => Task.FromResult(BuildGeminiOkEnvelope(new
        {
            suggestedCategory = "Medical",
            suggestedUrgencyLevel = "High",
            isPotentialDuplicate = false,
            confidenceScore = invalidConfidence,
            explanation = "Assessment complete."
        })));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_HallucinatedDuplicateRequestId_IsNeutralizedSafely()
    {
        var handler = new StubHttpMessageHandler((_, _) => Task.FromResult(BuildGeminiOkEnvelope(new
        {
            suggestedCategory = "Medical",
            suggestedUrgencyLevel = "High",
            isPotentialDuplicate = true,
            duplicateOfRequestId = 9999,
            confidenceScore = 0.75,
            explanation = "Possible duplicate check."
        })));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.False(result.IsPotentialDuplicate);
        Assert.Null(result.DuplicateOfRequestId);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_HallucinatedInventoryId_IsNeutralizedSafely()
    {
        var handler = new StubHttpMessageHandler((_, _) => Task.FromResult(BuildGeminiOkEnvelope(new
        {
            suggestedCategory = "Medical",
            suggestedUrgencyLevel = "High",
            isPotentialDuplicate = false,
            suggestedInventoryId = 8888,
            suggestedResourceQuantity = 5,
            confidenceScore = 0.8,
            explanation = "Inventory check."
        })));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.Null(result.SuggestedInventoryId);
        Assert.Null(result.SuggestedResourceQuantity);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_ExcessInventoryQuantity_IsCappedToAvailableStock()
    {
        var handler = new StubHttpMessageHandler((_, _) => Task.FromResult(BuildGeminiOkEnvelope(new
        {
            suggestedCategory = "Medical",
            suggestedUrgencyLevel = "High",
            isPotentialDuplicate = false,
            suggestedInventoryId = 501,
            suggestedResourceQuantity = 100,
            confidenceScore = 0.85,
            explanation = "Suggested stock exceeds available quantity."
        })));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.Equal(501, result.SuggestedInventoryId);
        Assert.Equal(25m, result.SuggestedResourceQuantity);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task AnalyzeCitizenRequestAsync_HttpErrorStatus_ThrowsAiProviderUnavailableWithoutLeakingKey(
        HttpStatusCode statusCode)
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent("{\"error\":{\"message\":\"upstream failure\"}}", Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.DoesNotContain(FakeApiKey, ex.Message);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_NetworkError_ThrowsAiProviderUnavailableException()
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            throw new HttpRequestException("Simulated DNS failure"));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Theory]
    [InlineData(0, 120)]
    [InlineData(-5, 120)]
    [InlineData(120, 120)]
    [InlineData(3, 5)]
    [InlineData(180, 180)]
    [InlineData(999, 300)]
    public void AiProviderOptions_GetEffectiveTimeout_AppliesDefault120SecondsAndClampsRange(
        int configuredSeconds,
        int expectedSeconds)
    {
        var options = new AiProviderOptions { TimeoutSeconds = configuredSeconds };
        Assert.Equal(TimeSpan.FromSeconds(expectedSeconds), options.GetEffectiveTimeout());
    }

    [Fact]
    public void AiProviderOptions_DefaultTimeout_Is120Seconds()
    {
        var options = new AiProviderOptions();
        Assert.Equal(120, options.TimeoutSeconds);
        Assert.Equal(TimeSpan.FromSeconds(120), options.GetEffectiveTimeout());
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_ProviderTimeout_ThrowsAiProviderUnavailableException()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var handler = new StubHttpMessageHandler(async (_, ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(15), ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions(timeoutSeconds: 5)),
            logger);

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Contains("timed out", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(FakeApiKey, ex.Message);

        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.Contains("5s", combinedLogs);
        Assert.Contains("gemini-3.1-flash-lite", combinedLogs);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_CallerCancellation_PropagatesOperationCanceledException()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var handler = new StubHttpMessageHandler(async (_, ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(10), ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext(), cts.Token));

        Assert.Empty(logger.Messages);
    }

    [Theory]
    [InlineData("gemini-3.1-flash-lite", "gemini-3.1-flash-lite")]
    [InlineData("models/gemini-3.1-flash-lite", "gemini-3.1-flash-lite")]
    [InlineData("  MODELS/gemini-3.1-flash-lite  ", "gemini-3.1-flash-lite")]
    [InlineData("/Models/gemini-3.1-flash-lite/", "gemini-3.1-flash-lite")]
    [InlineData("models/models/gemini-3.1-flash-lite", "gemini-3.1-flash-lite")]
    [InlineData("", "gemini-3.1-flash-lite")]
    [InlineData("   ", "gemini-3.1-flash-lite")]
    [InlineData("models/", "gemini-3.1-flash-lite")]
    public void AiProviderOptions_GetEffectiveModel_NormalizesWhitespaceCaseAndModelsPrefix(
        string configuredModel,
        string expectedModel)
    {
        var options = new AiProviderOptions { Model = configuredModel };
        Assert.Equal(expectedModel, options.GetEffectiveModel());
    }

    [Theory]
    [InlineData("gemini-3.1-flash-lite")]
    [InlineData("models/gemini-3.1-flash-lite")]
    [InlineData("  MODELS/gemini-3.1-flash-lite  ")]
    public async Task AnalyzeCitizenRequestAsync_ModelVariants_ProduceExactUrlWithoutDuplicateOrEncodedPrefix(
        string configuredModel)
    {
        Uri? capturedUri = null;
        var handler = new StubHttpMessageHandler((req, _) =>
        {
            capturedUri = req.RequestUri;
            return Task.FromResult(BuildGeminiOkEnvelope(new
            {
                suggestedCategory = "Food",
                suggestedUrgencyLevel = "High",
                isPotentialDuplicate = false,
                confidenceScore = 0.88,
                explanation = "Structured triage complete."
            }));
        });

        var options = CreateConfiguredOptions();
        options.Model = configuredModel;

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(options),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.NotNull(capturedUri);
        Assert.Equal(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
            capturedUri!.AbsoluteUri);
        Assert.DoesNotContain("%2F", capturedUri.AbsoluteUri, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("/models/models/", capturedUri.AbsoluteUri, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_Http404WithGoogleErrorBody_LogsSafeDiagnosticsAndProtectsKeyAndRawDetails()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var google404Json = JsonSerializer.Serialize(new
        {
            error = new
            {
                code = 404,
                message = $"models/gemini-3.1-flash-lite is not found for API version v1beta (echoed {FakeApiKey})",
                status = "NOT_FOUND"
            }
        });

        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound)
            {
                Content = new StringContent(google404Json, Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger);

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        // Exception remains safe and generic for HTTP 503 mapping (no raw Google error details or key)
        Assert.Contains("HTTP 404", ex.Message);
        Assert.DoesNotContain(FakeApiKey, ex.Message);
        Assert.DoesNotContain("is not found for API version v1beta", ex.Message);

        // Structured log captures model, endpoint (no credentials), status, Google status and sanitized message
        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.Contains("gemini-3.1-flash-lite", combinedLogs);
        Assert.Contains("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent", combinedLogs);
        Assert.Contains("404", combinedLogs);
        Assert.Contains("NOT_FOUND", combinedLogs);
        Assert.Contains("is not found for API version v1beta", combinedLogs);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
        Assert.Contains("[REDACTED_KEY]", combinedLogs);
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_Success_SendsFixedNonSensitivePromptAndReturnsOk()
    {
        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;

        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedRequest = req;
            capturedBody = await req.Content!.ReadAsStringAsync(ct);
            return BuildGeminiRawTextEnvelope("OK", "gemini-3.1-flash-lite");
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        var result = await sut.RunConnectivityDiagnosticAsync();

        Assert.NotNull(capturedRequest);
        Assert.Equal(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
            capturedRequest!.RequestUri!.AbsoluteUri);
        Assert.True(capturedRequest.Headers.TryGetValues("x-goog-api-key", out var keyValues));
        Assert.Equal(FakeApiKey, Assert.Single(keyValues));

        Assert.NotNull(capturedBody);
        Assert.Contains("Reply with exactly OK", capturedBody);
        Assert.DoesNotContain("citizenRequest", capturedBody);
        Assert.DoesNotContain("responseSchema", capturedBody);
        Assert.DoesNotContain(FakeApiKey, capturedBody);

        Assert.True(result.Success);
        Assert.Equal("Gemini", result.ProviderName);
        Assert.Equal("gemini-3.1-flash-lite", result.Model);
        Assert.Equal("OK", result.ResponseText);
        Assert.True(result.ElapsedMs >= 0);
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_ProviderTimeout_ThrowsAiProviderUnavailableWithoutLeakingKey()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var handler = new StubHttpMessageHandler(async (_, ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(15), ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions(timeoutSeconds: 5)),
            logger);

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.RunConnectivityDiagnosticAsync());

        Assert.Contains("timed out", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(FakeApiKey, ex.Message);

        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.Contains("gemini-3.1-flash-lite", combinedLogs);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
    }

    [Theory]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.Unauthorized)]
    public async Task RunConnectivityDiagnosticAsync_HttpError_ThrowsAiProviderUnavailableWithoutLeakingKey(
        HttpStatusCode statusCode)
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var errorJson = JsonSerializer.Serialize(new
        {
            error = new
            {
                code = (int)statusCode,
                status = statusCode.ToString().ToUpperInvariant(),
                message = $"Upstream error for diagnostic ({FakeApiKey})"
            }
        });

        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(errorJson, Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger);

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.RunConnectivityDiagnosticAsync());

        Assert.DoesNotContain(FakeApiKey, ex.Message);
        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_CallerCancellation_PropagatesOperationCanceledException()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var handler = new StubHttpMessageHandler(async (_, ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(10), ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            sut.RunConnectivityDiagnosticAsync(cts.Token));

        Assert.Empty(logger.Messages);
    }

    [Fact]
    public async Task UnconfiguredProvider_RunConnectivityDiagnosticAsync_ThrowsAiProviderUnavailableException()
    {
        var sut = new UnconfiguredAiAnalysisProvider();
        await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.RunConnectivityDiagnosticAsync());
    }

    [Fact]
    public void ComputeDefaultRetryDelay_UsesExponentialBackoffWithJitter()
    {
        var delay1 = GeminiAiAnalysisProvider.ComputeDefaultRetryDelay(1);
        var delay2 = GeminiAiAnalysisProvider.ComputeDefaultRetryDelay(2);

        Assert.InRange(delay1.TotalMilliseconds, 1000, 1500);
        Assert.InRange(delay2.TotalMilliseconds, 2000, 2500);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_Transient503ThenSuccess_RetriesAndSucceeds()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var attempts = 0;

        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            if (attempts <= 2)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
                {
                    Content = new StringContent(
                        "{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\",\"message\":\"High demand\"}}",
                        Encoding.UTF8,
                        "application/json")
                });
            }

            return Task.FromResult(BuildGeminiOkEnvelope(new
            {
                suggestedCategory = "Food",
                suggestedUrgencyLevel = "High",
                isPotentialDuplicate = false,
                confidenceScore = 0.9,
                explanation = "Succeeded on retry."
            }));
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.Equal(3, attempts);
        Assert.Equal("Food", result.SuggestedCategory);
        Assert.Equal("High", result.SuggestedUrgencyLevel);

        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.Contains("retryable attempt 1/3", combinedLogs);
        Assert.Contains("retryable attempt 2/3", combinedLogs);
        Assert.DoesNotContain("final failure", combinedLogs);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_Transient503ThenSuccess_RetriesAndReturnsOk()
    {
        var attempts = 0;
        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            if (attempts == 1)
            {
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
                {
                    Content = new StringContent(
                        "{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\",\"message\":\"Temporary spike\"}}",
                        Encoding.UTF8,
                        "application/json")
                });
            }

            return Task.FromResult(BuildGeminiRawTextEnvelope("OK", "gemini-3.1-flash-lite"));
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var result = await sut.RunConnectivityDiagnosticAsync();

        Assert.Equal(2, attempts);
        Assert.True(result.Success);
        Assert.Equal("OK", result.ResponseText);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_Persistent503_ExhaustsMax2RetriesAndLogsFinalFailure()
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var attempts = 0;

        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
            {
                Content = new StringContent(
                    "{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\",\"message\":\"High demand\"}}",
                    Encoding.UTF8,
                    "application/json")
            });
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Equal(3, attempts); // 1 initial attempt + 2 retries
        Assert.Contains("503", ex.Message);
        Assert.DoesNotContain(FakeApiKey, ex.Message);

        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.Contains("retryable attempt 1/3", combinedLogs);
        Assert.Contains("retryable attempt 2/3", combinedLogs);
        Assert.Contains("final failure: upstream HTTP 503 persisted after 3/3 attempts", combinedLogs);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_CancellationDuring503Backoff_StopsImmediatelyAndPropagatesCancellation()
    {
        var attempts = 0;
        using var cts = new CancellationTokenSource();

        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            cts.CancelAfter(TimeSpan.FromMilliseconds(30));
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)
            {
                Content = new StringContent(
                    "{\"error\":{\"code\":503,\"status\":\"UNAVAILABLE\",\"message\":\"High demand\"}}",
                    Encoding.UTF8,
                    "application/json")
            });
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance,
            retryDelayProvider: _ => TimeSpan.FromSeconds(10));

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext(), cts.Token));

        Assert.Equal(1, attempts);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    [InlineData(HttpStatusCode.TooManyRequests)]
    public async Task AnalyzeCitizenRequestAsync_NonRetryableStatusCodes_NeverRetryAndHandle429Separately(
        HttpStatusCode statusCode)
    {
        var logger = new CapturingLogger<GeminiAiAnalysisProvider>();
        var attempts = 0;

        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            return Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(
                    $"{{\"error\":{{\"code\":{(int)statusCode},\"status\":\"ERR\",\"message\":\"Failure\"}}}}",
                    Encoding.UTF8,
                    "application/json")
            });
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            logger,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Equal(1, attempts);
        Assert.DoesNotContain(FakeApiKey, ex.Message);

        if (statusCode == HttpStatusCode.TooManyRequests)
        {
            Assert.Contains("rate limit", ex.Message, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain("503", ex.Message);
        }

        var combinedLogs = string.Join("\n", logger.Messages);
        Assert.Contains("final failure", combinedLogs);
        Assert.DoesNotContain("retryable attempt", combinedLogs);
        Assert.DoesNotContain(FakeApiKey, combinedLogs);
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            Messages.Add(formatter(state, exception));
        }
    }

    private sealed class StubHttpMessageHandler(
        Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            responder(request, cancellationToken);
    }
}
