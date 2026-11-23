using System.Net;
using System.Text;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.Exceptions;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.DependencyInjection;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
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

    private static AiProviderOptions CreateConfiguredOptions(int timeoutSeconds = 30) => new()
    {
        Provider = "Gemini",
        GeminiApiKey = FakeApiKey,
        Model = "gemini-2.5-flash",
        TimeoutSeconds = timeoutSeconds
    };

    private static HttpResponseMessage BuildGeminiOkEnvelope(object innerRecommendation, string modelVersion = "gemini-2.5-flash-001")
    {
        var innerJson = JsonSerializer.Serialize(innerRecommendation);
        return BuildGeminiRawTextEnvelope(innerJson, modelVersion);
    }

    private static HttpResponseMessage BuildGeminiRawTextEnvelope(string innerText, string modelVersion = "gemini-2.5-flash-001")
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
            o.Model = "gemini-2.5-flash";
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
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
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
        Assert.Equal("gemini-2.5-flash-001", result.ModelVersion);
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

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_ProviderTimeout_ThrowsAiProviderUnavailableException()
    {
        var handler = new StubHttpMessageHandler(async (_, ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(15), ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions(timeoutSeconds: 5)),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_CallerCancellation_PropagatesOperationCanceledException()
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();

        var handler = new StubHttpMessageHandler(async (_, ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(10), ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        });

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(CreateConfiguredOptions()),
            NullLogger<GeminiAiAnalysisProvider>.Instance);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext(), cts.Token));
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
