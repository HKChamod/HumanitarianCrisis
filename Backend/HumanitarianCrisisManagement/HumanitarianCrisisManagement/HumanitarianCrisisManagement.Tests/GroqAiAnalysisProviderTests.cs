using System.Net;
using System.Net.Http.Headers;
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

public class GroqAiAnalysisProviderTests
{
    private const string FakeGroqKey = "TEST-GROQ-KEY-DO-NOT-LEAK-77777";
    private const string FakeGeminiKey = "TEST-GEMINI-KEY-DO-NOT-LEAK-99999";

    private static AiProviderOptions CreateGroqOptions(int timeoutSeconds = 120) => new()
    {
        Provider = "Groq",
        GroqApiKey = FakeGroqKey,
        GroqModel = "openai/gpt-oss-120b",
        GroqBaseUrl = "https://api.groq.com/openai/v1",
        TimeoutSeconds = timeoutSeconds,
        IncludeSanitizedDescriptions = false
    };

    private static AiAnalysisContext CreateSampleContext() => new()
    {
        CitizenRequestId = 42,
        RequestType = "Medical",
        Description = "Sensitive citizen description with 077-1234567 and 901234567V.",
        CurrentUrgencyLevel = "High",
        PeopleCount = 5,
        AreaId = 2,
        AreaName = "Kalutara South",
        Address = "42 Private Lane, Secret Street",
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
                Description = "Sibling sensitive description.",
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

    private static HttpResponseMessage BuildGroqOkEnvelope(object innerRecommendation, string model = "openai/gpt-oss-120b")
    {
        return BuildGroqRawContentEnvelope(JsonSerializer.Serialize(innerRecommendation), model);
    }

    private static HttpResponseMessage BuildGroqRawContentEnvelope(string content, string model = "openai/gpt-oss-120b")
    {
        var envelope = new
        {
            id = "chatcmpl-test",
            model,
            choices = new[]
            {
                new
                {
                    index = 0,
                    message = new
                    {
                        role = "assistant",
                        content
                    }
                }
            }
        };

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
        };
    }

    [Fact]
    public void DiProviderSelection_SelectsGroqProvider_WhenGroqConfigured()
    {
        var services = new ServiceCollection();
        services.Configure<AiProviderOptions>(o =>
        {
            o.Provider = "Groq";
            o.GroqApiKey = FakeGroqKey;
            o.GeminiApiKey = FakeGeminiKey;
        });
        services.AddSingleton(new HttpClient(new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)))));
        services.AddLogging();
        services.AddScoped<GeminiAiAnalysisProvider>();
        services.AddScoped<GroqAiAnalysisProvider>();
        services.AddAiAnalysisProviderSelection();

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var aiProvider = scope.ServiceProvider.GetRequiredService<IAiAnalysisProvider>();

        Assert.IsType<GroqAiAnalysisProvider>(aiProvider);
        Assert.True(aiProvider.IsConfigured);
        Assert.Equal("Groq", aiProvider.ProviderName);
    }

    [Fact]
    public void DiProviderSelection_WhenGroqSelectedAndKeyMissing_FallsBackToUnconfiguredWithoutSwitchingToGemini()
    {
        var services = new ServiceCollection();
        services.Configure<AiProviderOptions>(o =>
        {
            o.Provider = "Groq";
            o.GroqApiKey = "";
            o.GeminiApiKey = FakeGeminiKey; // Must NOT silently switch to Gemini!
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
    public void AiProviderOptions_GroqDefaults_MatchRequiredModelAndEndpoint()
    {
        var options = new AiProviderOptions();
        Assert.Equal("openai/gpt-oss-120b", options.GetEffectiveGroqModel());
        Assert.Equal("https://api.groq.com/openai/v1", options.GetEffectiveGroqBaseUrl());
        Assert.False(options.IncludeSanitizedDescriptions);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_ValidResponse_UsesExactEndpointBearerAuthModelAndStrictPrivacy()
    {
        HttpRequestMessage? capturedRequest = null;
        string? capturedBody = null;

        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedRequest = req;
            capturedBody = await req.Content!.ReadAsStringAsync(ct);

            return BuildGroqOkEnvelope(new
            {
                suggestedCategory = "Medical",
                suggestedUrgencyLevel = "Critical",
                isPotentialDuplicate = true,
                duplicateOfRequestId = 101,
                suggestedInventoryId = 501,
                suggestedResourceQuantity = 40, // exceeds 25 -> must cap to 25
                confidenceScore = 0.91,
                explanation = "High-priority medical request in flood-affected Kalutara South."
            });
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.NotNull(capturedRequest);
        Assert.Equal(
            "https://api.groq.com/openai/v1/chat/completions",
            capturedRequest!.RequestUri!.AbsoluteUri);
        Assert.Equal("Bearer", capturedRequest.Headers.Authorization?.Scheme);
        Assert.Equal(FakeGroqKey, capturedRequest.Headers.Authorization?.Parameter);

        Assert.NotNull(capturedBody);
        Assert.Contains("\"model\":\"openai/gpt-oss-120b\"", capturedBody);
        Assert.Contains("\"include_reasoning\":false", capturedBody);
        Assert.Contains("\"reasoning_effort\":\"low\"", capturedBody);
        Assert.Contains("\"stream\":false", capturedBody);
        Assert.Contains("\"max_completion_tokens\":2048", capturedBody);
        Assert.Contains("\"response_format\":{\"type\":\"json_object\"}", capturedBody);
        Assert.DoesNotContain("reasoning_format", capturedBody);
        Assert.DoesNotContain("\"max_tokens\"", capturedBody);
        Assert.DoesNotContain("42 Private Lane", capturedBody);
        Assert.DoesNotContain("077-1234567", capturedBody);
        Assert.DoesNotContain("901234567V", capturedBody);
        Assert.DoesNotContain("Sibling sensitive description", capturedBody);

        Assert.Equal("Medical", result.SuggestedCategory);
        Assert.Equal("Critical", result.SuggestedUrgencyLevel);
        Assert.True(result.IsPotentialDuplicate);
        Assert.Equal(101, result.DuplicateOfRequestId);
        Assert.Equal(501, result.SuggestedInventoryId);
        Assert.Equal(25m, result.SuggestedResourceQuantity);
        Assert.Equal(0.91m, result.ConfidenceScore);
        Assert.Equal("Groq", result.ProviderName);
        Assert.Equal("openai/gpt-oss-120b", result.ModelVersion);
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_Success_SendsOnlyFixedPromptAndReturnsOk()
    {
        string? capturedBody = null;
        Uri? capturedUri = null;

        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedUri = req.RequestUri;
            capturedBody = await req.Content!.ReadAsStringAsync(ct);
            return BuildGroqRawContentEnvelope("OK", "openai/gpt-oss-120b");
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        var result = await sut.RunConnectivityDiagnosticAsync();

        Assert.Equal("https://api.groq.com/openai/v1/chat/completions", capturedUri!.AbsoluteUri);
        Assert.NotNull(capturedBody);
        Assert.Contains("Reply with exactly OK", capturedBody);
        Assert.Contains("\"model\":\"openai/gpt-oss-120b\"", capturedBody);
        Assert.Contains("\"include_reasoning\":false", capturedBody);
        Assert.Contains("\"reasoning_effort\":\"low\"", capturedBody);
        Assert.Contains("\"stream\":false", capturedBody);
        Assert.Contains("\"max_completion_tokens\":256", capturedBody);
        Assert.DoesNotContain("reasoning_format", capturedBody);
        Assert.DoesNotContain("\"max_tokens\"", capturedBody);
        Assert.DoesNotContain("response_format", capturedBody);
        Assert.DoesNotContain("citizenRequest", capturedBody);
        Assert.DoesNotContain(FakeGroqKey, capturedBody);

        Assert.True(result.Success);
        Assert.Equal("Groq", result.ProviderName);
        Assert.Equal("openai/gpt-oss-120b", result.Model);
        Assert.Equal("OK", result.ResponseText);
    }

    [Theory]
    [InlineData(HttpStatusCode.BadRequest)]
    [InlineData(HttpStatusCode.Unauthorized)]
    [InlineData(HttpStatusCode.Forbidden)]
    [InlineData(HttpStatusCode.NotFound)]
    public async Task AnalyzeCitizenRequestAsync_NonRetryableAuthValidationOrNotFound_NeverRetriesAndProtectsKey(
        HttpStatusCode statusCode)
    {
        var logger = new CapturingLogger<GroqAiAnalysisProvider>();
        var attempts = 0;

        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            var body = JsonSerializer.Serialize(new
            {
                error = new
                {
                    type = "invalid_request_error",
                    message = $"Error echoing {FakeGroqKey}"
                }
            });
            return Task.FromResult(new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            });
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            logger,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Equal(1, attempts);
        Assert.DoesNotContain(FakeGroqKey, ex.Message);

        var logs = string.Join("\n", logger.Messages);
        Assert.DoesNotContain(FakeGroqKey, logs);
        Assert.Contains("[REDACTED_KEY]", logs);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_Http429WithoutRetryAfter_FailsFastWithoutAggressiveRetries()
    {
        var attempts = 0;
        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.TooManyRequests)
            {
                Content = new StringContent(
                    "{\"error\":{\"type\":\"rate_limit_exceeded\",\"message\":\"Rate limit reached\"}}",
                    Encoding.UTF8,
                    "application/json")
            });
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var ex = await Assert.ThrowsAsync<AiProviderUnavailableException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Equal(1, attempts);
        Assert.Contains("429", ex.Message);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_Http429WithShortRetryAfter_RespectsHeaderOnceAndSucceeds()
    {
        var attempts = 0;
        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            if (attempts == 1)
            {
                var resp = new HttpResponseMessage(HttpStatusCode.TooManyRequests)
                {
                    Content = new StringContent(
                        "{\"error\":{\"type\":\"rate_limit_exceeded\",\"message\":\"Retry shortly\"}}",
                        Encoding.UTF8,
                        "application/json")
                };
                resp.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromMilliseconds(50));
                return Task.FromResult(resp);
            }

            return Task.FromResult(BuildGroqOkEnvelope(new
            {
                suggestedCategory = "Medical",
                suggestedUrgencyLevel = "High",
                isPotentialDuplicate = false,
                confidenceScore = 0.85,
                explanation = "Succeeded after respectful Retry-After wait."
            }));
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.Equal(2, attempts);
        Assert.Equal("Medical", result.SuggestedCategory);
    }

    [Theory]
    [InlineData(HttpStatusCode.InternalServerError)]
    [InlineData(HttpStatusCode.BadGateway)]
    [InlineData(HttpStatusCode.ServiceUnavailable)]
    [InlineData(HttpStatusCode.GatewayTimeout)]
    public async Task AnalyzeCitizenRequestAsync_Transient5xx_RetriesAndSucceedsOnRecovery(HttpStatusCode statusCode)
    {
        var attempts = 0;
        var handler = new StubHttpMessageHandler((_, _) =>
        {
            attempts++;
            if (attempts == 1)
            {
                return Task.FromResult(new HttpResponseMessage(statusCode)
                {
                    Content = new StringContent(
                        "{\"error\":{\"type\":\"server_error\",\"message\":\"Temporary issue\"}}",
                        Encoding.UTF8,
                        "application/json")
                });
            }

            return Task.FromResult(BuildGroqOkEnvelope(new
            {
                suggestedCategory = "Food",
                suggestedUrgencyLevel = "Medium",
                isPotentialDuplicate = false,
                confidenceScore = 0.8,
                explanation = "Recovered on retry."
            }));
        });

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance,
            retryDelayProvider: _ => TimeSpan.FromMilliseconds(5));

        var result = await sut.AnalyzeCitizenRequestAsync(CreateSampleContext());

        Assert.Equal(2, attempts);
        Assert.Equal("Food", result.SuggestedCategory);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_MalformedJson_ThrowsInvalidOperationException()
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("not valid json {{{", Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));
    }

    [Theory]
    [InlineData("", "High", 0.8, "Valid explanation")]
    [InlineData("Medical", "Extreme", 0.8, "Valid explanation")]
    [InlineData("Medical", "High", 1.5, "Valid explanation")]
    [InlineData("Medical", "High", 0.8, "")]
    public async Task AnalyzeCitizenRequestAsync_InvalidModelResponseFields_ThrowsInvalidOperationException(
        string category,
        string urgency,
        double confidence,
        string explanation)
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(BuildGroqOkEnvelope(new
            {
                suggestedCategory = category,
                suggestedUrgencyLevel = urgency,
                isPotentialDuplicate = false,
                confidenceScore = confidence,
                explanation
            })));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
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

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext(), cts.Token));
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_ReasoningPresentButEmptyContent_RejectsAndNeverUsesReasoningAsAnswer()
    {
        var logger = new CapturingLogger<GroqAiAnalysisProvider>();
        var envelope = new
        {
            model = "openai/gpt-oss-120b",
            choices = new[]
            {
                new
                {
                    finish_reason = "stop",
                    message = new
                    {
                        role = "assistant",
                        content = "",
                        reasoning = "The user wants me to reply with OK."
                    }
                }
            }
        };

        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            logger);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.RunConnectivityDiagnosticAsync());

        Assert.Contains("reasoning without final content", ex.Message, StringComparison.OrdinalIgnoreCase);
        var logs = string.Join("\n", logger.Messages);
        Assert.Contains("HasReasoning=True", logs);
        Assert.DoesNotContain("The user wants me to reply", logs);
    }

    [Fact]
    public async Task RunConnectivityDiagnosticAsync_EmptyContentWithFinishReasonLength_ReportsTokenLimitError()
    {
        var logger = new CapturingLogger<GroqAiAnalysisProvider>();
        var envelope = new
        {
            model = "openai/gpt-oss-120b",
            choices = new[]
            {
                new
                {
                    finish_reason = "length",
                    message = new
                    {
                        role = "assistant",
                        content = (string?)null,
                        reasoning = "Thinking about replying OK..."
                    }
                }
            }
        };

        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            logger);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.RunConnectivityDiagnosticAsync());

        Assert.Contains("finish_reason=length", ex.Message);
        Assert.Contains("token limit", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AnalyzeCitizenRequestAsync_EmptyContentWithFinishReasonLength_RejectsSafely()
    {
        var envelope = new
        {
            model = "openai/gpt-oss-120b",
            choices = new[]
            {
                new
                {
                    finish_reason = "length",
                    message = new
                    {
                        role = "assistant",
                        content = "",
                        reasoning = "Step 1: analyze medical request..."
                    }
                }
            }
        };

        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Contains("finish_reason=length", ex.Message);
    }

    [Theory]
    [InlineData("{\"model\":\"openai/gpt-oss-120b\",\"choices\":[]}")]
    [InlineData("{\"model\":\"openai/gpt-oss-120b\"}")]
    public async Task AnalyzeCitizenRequestAsync_MissingOrEmptyChoices_ThrowsInvalidOperationException(string rawJson)
    {
        var handler = new StubHttpMessageHandler((_, _) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(rawJson, Encoding.UTF8, "application/json")
            }));

        using var httpClient = new HttpClient(handler) { Timeout = Timeout.InfiniteTimeSpan };
        var sut = new GroqAiAnalysisProvider(
            httpClient,
            Options.Create(CreateGroqOptions()),
            NullLogger<GroqAiAnalysisProvider>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.AnalyzeCitizenRequestAsync(CreateSampleContext()));

        Assert.Contains("choices", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    private sealed class CapturingLogger<T> : ILogger<T>
    {
        public List<string> Messages { get; } = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) =>
            Messages.Add(formatter(state, exception));
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
