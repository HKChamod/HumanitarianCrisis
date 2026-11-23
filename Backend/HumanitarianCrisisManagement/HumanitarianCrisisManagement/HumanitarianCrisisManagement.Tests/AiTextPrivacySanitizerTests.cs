using System.Net;
using System.Text;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

public class AiTextPrivacySanitizerTests
{
    private const string FakeApiKey = "TEST-GEMINI-KEY-PRIVACY-12345";
    private readonly AiTextPrivacySanitizer _sanitizer = new();

    [Theory]
    [InlineData("0771234567")]
    [InlineData("071-234-5678")]
    [InlineData("+94 76 555 1234")]
    [InlineData("0094 70 111 2222")]
    [InlineData("+94 (0)75 888 9999")]
    [InlineData("011-2345678")]
    [InlineData("(011) 234 5678")]
    [InlineData("+94 11 234 5678")]
    [InlineData("034-2223344")]
    [InlineData("081 223 4567")]
    public void SanitizeFreeText_RedactsSriLankanMobileAndLandlinePhones(string phoneNumber)
    {
        var input = $"Urgent drinking water needed for 8 displaced families after flood. Reach {phoneNumber} for delivery.";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.True(result.Included);
        Assert.NotNull(result.SanitizedText);
        Assert.DoesNotContain(phoneNumber, result.SanitizedText);
        Assert.Contains("[REDACTED_PHONE]", result.SanitizedText);
        Assert.Contains("Urgent drinking water needed", result.SanitizedText);
    }

    [Theory]
    [InlineData("901234567V")]
    [InlineData("851234567x")]
    [InlineData("90 123 4567 V")]
    [InlineData("199012345678")]
    [InlineData("200145601234")]
    [InlineData("1990-1234-5678")]
    public void SanitizeFreeText_RedactsSriLankanOldAndNewNics(string nic)
    {
        var input = $"Family of 4 needs emergency medical kits urgently; reference {nic} at shelter.";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.True(result.Included);
        Assert.NotNull(result.SanitizedText);
        Assert.DoesNotContain(nic, result.SanitizedText);
        Assert.Contains("[REDACTED_NIC]", result.SanitizedText);
    }

    [Theory]
    [InlineData("citizen.help@example.lk")]
    [InlineData("relief_user+1@test.org")]
    public void SanitizeFreeText_RedactsEmailAddresses(string email)
    {
        var input = $"Flooded homes need dry rations and blankets for 6 people. Send updates to {email} today.";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.True(result.Included);
        Assert.NotNull(result.SanitizedText);
        Assert.DoesNotContain(email, result.SanitizedText);
        Assert.Contains("[REDACTED_EMAIL]", result.SanitizedText);
    }

    [Theory]
    [InlineData("No. 42/A, Galle Road")]
    [InlineData("Apt 9B, Lotus Mawatha")]
    [InlineData("House No 15 Temple Lane")]
    [InlineData("6.9271, 79.8612")]
    public void SanitizeFreeText_RedactsExplicitAddressAndGpsPatterns(string locationDetail)
    {
        var input = $"Roof damaged during storm near {locationDetail} and 5 children need dry food packs.";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.True(result.Included);
        Assert.NotNull(result.SanitizedText);
        Assert.DoesNotContain(locationDetail, result.SanitizedText);
        Assert.True(
            result.SanitizedText.Contains("[REDACTED_ADDRESS]") ||
            result.SanitizedText.Contains("[REDACTED_LOCATION]"));
    }

    [Fact]
    public void SanitizeFreeText_OmitsDescriptionFailClosed_WhenResidualIdentityCueRemains()
    {
        var input = "Need urgent medical aid. Residing at behind the old red shop next to the bridge, ask for my brother.";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.False(result.Included);
        Assert.Null(result.SanitizedText);
        Assert.NotNull(result.OmissionReason);
    }

    [Fact]
    public void SanitizeFreeText_OmitsDescriptionFailClosed_WhenResidualLongDigitNumberRemains()
    {
        var input = "Need food packs urgently for displaced family, reference account 445566778899 immediately.";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.False(result.Included);
        Assert.Null(result.SanitizedText);
    }

    [Fact]
    public void SanitizeFreeText_OmitsDescriptionFailClosed_WhenPredominantlyPersonalData()
    {
        var input = "077-1234567 901234567V test@example.lk";

        var result = _sanitizer.SanitizeFreeText(input, 2000);

        Assert.False(result.Included);
        Assert.Null(result.SanitizedText);
    }

    [Fact]
    public async Task GeminiProvider_NeverSendsRecognizablePiiFromCurrentOrRecentDescriptionsToHttpHandler()
    {
        string? capturedBody = null;

        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedBody = await req.Content!.ReadAsStringAsync(ct);

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
                                new
                                {
                                    text = JsonSerializer.Serialize(new
                                    {
                                        suggestedCategory = "Medical",
                                        suggestedUrgencyLevel = "Critical",
                                        isPotentialDuplicate = true,
                                        duplicateOfRequestId = 202,
                                        suggestedInventoryId = 501,
                                        suggestedResourceQuantity = 5,
                                        confidenceScore = 0.9,
                                        explanation = "Urgent medical triage based on sanitized operational context."
                                    })
                                }
                            }
                        }
                    }
                },
                modelVersion = "gemini-2.5-flash-001"
            };

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
            };
        });

        var context = new AiAnalysisContext
        {
            CitizenRequestId = 77,
            RequestType = "Medical",
            Description = "5 elderly people need insulin urgently. Mr. Nimal Perera, 077-8899001, 011-2345678, nimal.perera@example.lk, 901234567V, 199012345678, No. 42/A Galle Road, N1234567.",
            CurrentUrgencyLevel = "High",
            PeopleCount = 5,
            AreaId = 2,
            AreaName = "Kalutara South",
            Address = "No. 42/A Galle Road, Kalutara",
            CrisisId = 7,
            CrisisName = "Monsoon Flood 2026",
            CrisisType = "Flood",
            CrisisSeverityLevel = "High",
            RecentAreaRequests =
            [
                new AiSiblingRequestSnapshot
                {
                    RequestId = 202,
                    RequestType = "Medical",
                    Description = "Insulin needed for flooded family; +94 71 998 8776, sibling.contact@example.org, 200145601234, Apt 4C Lotus Mawatha.",
                    Status = "Pending",
                    CreatedAt = new DateTime(2026, 11, 22, 8, 30, 0, DateTimeKind.Utc)
                },
                new AiSiblingRequestSnapshot
                {
                    RequestId = 203,
                    RequestType = "Food",
                    Description = "Residing at the green gate near the canal, call me on whatsapp for dry rations.",
                    Status = "Pending",
                    CreatedAt = new DateTime(2026, 11, 22, 9, 0, 0, DateTimeKind.Utc)
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

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(new AiProviderOptions
            {
                Provider = "Gemini",
                GeminiApiKey = FakeApiKey,
                Model = "gemini-2.5-flash",
                IncludeSanitizedDescriptions = true
            }),
            NullLogger<GeminiAiAnalysisProvider>.Instance,
            _sanitizer);

        var result = await sut.AnalyzeCitizenRequestAsync(context);

        Assert.NotNull(capturedBody);

        // Verify zero recognizable PII from either current or recent requests reached the HTTP handler
        string[] forbiddenTokens =
        [
            "Nimal Perera",
            "077-8899001",
            "011-2345678",
            "nimal.perera@example.lk",
            "901234567V",
            "199012345678",
            "Galle Road",
            "N1234567",
            "+94 71 998 8776",
            "sibling.contact@example.org",
            "200145601234",
            "Lotus Mawatha",
            "green gate near the canal"
        ];

        foreach (var token in forbiddenTokens)
        {
            Assert.DoesNotContain(token, capturedBody);
        }

        // Verify operational fields required for triage, duplicate matching, and inventory matching remain intact
        using var outerDoc = JsonDocument.Parse(capturedBody);
        var userPromptText = outerDoc.RootElement
            .GetProperty("contents")[0]
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()!;

        Assert.Contains("Kalutara South", userPromptText);
        Assert.Contains("Monsoon Flood 2026", userPromptText);
        Assert.Contains("Emergency First-Aid Kit", userPromptText);
        Assert.Contains("\"requestId\":202", userPromptText);
        Assert.Contains("\"requestId\":203", userPromptText);

        Assert.Equal("Medical", result.SuggestedCategory);
        Assert.Equal("Critical", result.SuggestedUrgencyLevel);
        Assert.True(result.IsPotentialDuplicate);
        Assert.Equal(202, result.DuplicateOfRequestId);
        Assert.Equal(501, result.SuggestedInventoryId);
    }

    [Fact]
    public async Task GeminiProvider_OmitsAllFreeTextDescriptions_WhenIncludeSanitizedDescriptionsIsFalse()
    {
        string? capturedBody = null;

        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedBody = await req.Content!.ReadAsStringAsync(ct);

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
                                new
                                {
                                    text = JsonSerializer.Serialize(new
                                    {
                                        suggestedCategory = "Water",
                                        suggestedUrgencyLevel = "High",
                                        isPotentialDuplicate = false,
                                        confidenceScore = 0.8,
                                        explanation = "Structured-only triage."
                                    })
                                }
                            }
                        }
                    }
                }
            };

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
            };
        });

        var context = new AiAnalysisContext
        {
            CitizenRequestId = 88,
            RequestType = "Water",
            Description = "Clean operational text that must still be omitted when strict mode is active.",
            CurrentUrgencyLevel = "High",
            PeopleCount = 12,
            AreaId = 3,
            AreaName = "Gampaha",
            RecentAreaRequests =
            [
                new AiSiblingRequestSnapshot
                {
                    RequestId = 301,
                    RequestType = "Water",
                    Description = "Sibling free text that must also be omitted.",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                }
            ]
        };

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(new AiProviderOptions
            {
                Provider = "Gemini",
                GeminiApiKey = FakeApiKey,
                Model = "gemini-2.5-flash",
                IncludeSanitizedDescriptions = false
            }),
            NullLogger<GeminiAiAnalysisProvider>.Instance,
            _sanitizer);

        await sut.AnalyzeCitizenRequestAsync(context);

        Assert.NotNull(capturedBody);
        Assert.DoesNotContain("Clean operational text", capturedBody);
        Assert.DoesNotContain("Sibling free text", capturedBody);

        using var outerDoc = JsonDocument.Parse(capturedBody);
        var userPromptText = outerDoc.RootElement
            .GetProperty("contents")[0]
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()!;

        Assert.DoesNotContain("\"sanitizedDescription\"", userPromptText);
        Assert.Contains("Gampaha", userPromptText);
        Assert.Contains("\"peopleCount\":12", userPromptText);
    }

    [Fact]
    public async Task GeminiProvider_MissingIncludeSanitizedDescriptionsConfig_DefaultsToFalseAndOmitsAllDescriptions()
    {
        var defaultOptions = new AiProviderOptions
        {
            Provider = "Gemini",
            GeminiApiKey = FakeApiKey,
            Model = "gemini-2.5-flash"
        };

        Assert.False(defaultOptions.IncludeSanitizedDescriptions);

        string? capturedBody = null;
        var handler = new StubHttpMessageHandler(async (req, ct) =>
        {
            capturedBody = await req.Content!.ReadAsStringAsync(ct);

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
                                new
                                {
                                    text = JsonSerializer.Serialize(new
                                    {
                                        suggestedCategory = "Food",
                                        suggestedUrgencyLevel = "Medium",
                                        isPotentialDuplicate = false,
                                        confidenceScore = 0.78,
                                        explanation = "Triage based on structured fields only."
                                    })
                                }
                            }
                        }
                    }
                }
            };

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(JsonSerializer.Serialize(envelope), Encoding.UTF8, "application/json")
            };
        });

        var context = new AiAnalysisContext
        {
            CitizenRequestId = 99,
            RequestType = "Food",
            Description = "Original current request description that must not leave server in default strict mode.",
            CurrentUrgencyLevel = "Medium",
            PeopleCount = 4,
            AreaId = 1,
            AreaName = "Colombo Central",
            RecentAreaRequests =
            [
                new AiSiblingRequestSnapshot
                {
                    RequestId = 401,
                    RequestType = "Food",
                    Description = "Original recent area description that must not leave server in default strict mode.",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                }
            ]
        };

        using var httpClient = new HttpClient(handler);
        var sut = new GeminiAiAnalysisProvider(
            httpClient,
            Options.Create(defaultOptions),
            NullLogger<GeminiAiAnalysisProvider>.Instance,
            _sanitizer);

        await sut.AnalyzeCitizenRequestAsync(context);

        Assert.NotNull(capturedBody);
        Assert.DoesNotContain("Original current request description", capturedBody);
        Assert.DoesNotContain("Original recent area description", capturedBody);

        using var outerDoc = JsonDocument.Parse(capturedBody);
        var userPromptText = outerDoc.RootElement
            .GetProperty("contents")[0]
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString()!;

        Assert.DoesNotContain("\"sanitizedDescription\"", userPromptText);
        Assert.Contains("Colombo Central", userPromptText);
        Assert.Contains("\"requestId\":401", userPromptText);
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
