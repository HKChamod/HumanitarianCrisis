using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

/// <summary>
/// API-level end-to-end integration tests for <c>PATCH /api/AiRecommendations/{id}/review</c>.
/// Exercises the real ASP.NET Core HTTP pipeline:
/// HTTP Request -> JWT Authentication -> PermissionAuthorizationHandler (AI.Review) ->
/// AiRecommendationsController -> AiDecisionSupportService -> EF Core (isolated SQLite in-memory) -> AuditLogService.
/// Never connects to SQL Server (HumanitarianCrisisDB) and never calls any live AI provider.
/// </summary>
public class AiRecommendationApiIntegrationTests
{
    private const int CitizenUserId = 9001;
    private const int ReviewerUserId = 9002;
    private const int SyntheticAreaId = 9001;
    private const int SyntheticRequestId = 9001;
    private const int SyntheticRecommendationId = 9001;
    private const string SyntheticSensitiveDescription = "SYNTHETIC-FREE-TEXT-0771234567-901234567V";
    private const string SyntheticSensitiveAddress = "SYNTHETIC-PRIVATE-ADDRESS-42";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // --- Scenario A: Authorized reviewer - Approve ---

    [Fact]
    public async Task ReviewEndpoint_AuthorizedReviewer_Approve_Returns200PersistsDecisionPreservesCitizenRequestAndRecordsAuditLog()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Verified via regional dispatch report."
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AiRecommendationResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(SyntheticRecommendationId, body.RecommendationId);
        Assert.Equal(SyntheticRequestId, body.CitizenRequestId);
        Assert.Equal("Approved", body.ReviewStatus);
        Assert.Equal(ReviewerUserId, body.ReviewedByUserId);
        Assert.NotNull(body.ReviewedAt);
        Assert.Equal("Verified via regional dispatch report.", body.HumanDecisionNote);
        Assert.Null(body.OverriddenCategory);
        Assert.Null(body.OverriddenUrgencyLevel);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persisted = await db.AiRecommendations.AsNoTracking()
            .SingleAsync(r => r.RecommendationId == SyntheticRecommendationId);
        Assert.Equal(AiRecommendationReviewStatus.Approved, persisted.ReviewStatus);
        Assert.Equal(ReviewerUserId, persisted.ReviewedByUserId);
        Assert.NotNull(persisted.ReviewedAt);
        Assert.NotNull(persisted.UpdatedAt);
        Assert.Equal("Verified via regional dispatch report.", persisted.HumanDecisionNote);
        Assert.Null(persisted.OverriddenCategory);
        Assert.Null(persisted.OverriddenUrgencyLevel);

        await AssertCitizenRequestUnchangedAsync(db);

        var audit = await db.AuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(ReviewerUserId, audit.ActorUserId);
        Assert.Equal("AiRecommendation.Approved", audit.Action);
        Assert.Equal("AiRecommendation", audit.EntityType);
        Assert.Equal(SyntheticRecommendationId.ToString(), audit.EntityId);
        Assert.Contains($"#{SyntheticRecommendationId}", audit.Summary);
        Assert.Contains($"#{SyntheticRequestId}", audit.Summary);
        Assert.Contains("Approved", audit.Summary);
        AssertNoSensitivePiiInAudit(audit);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario B: Authorized reviewer - Override ---

    [Fact]
    public async Task ReviewEndpoint_AuthorizedReviewer_Override_Returns200PersistsOverridesPreservesCitizenRequestAndRecordsAuditLog()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Overridden",
                OverriddenCategory = "Medical",
                OverriddenUrgencyLevel = "Critical",
                HumanDecisionNote = "Escalated after triage nurse confirmation."
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AiRecommendationResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal("Overridden", body.ReviewStatus);
        Assert.Equal("Medical", body.OverriddenCategory);
        Assert.Equal("Critical", body.OverriddenUrgencyLevel);
        Assert.Equal(ReviewerUserId, body.ReviewedByUserId);
        Assert.NotNull(body.ReviewedAt);
        Assert.Equal("Escalated after triage nurse confirmation.", body.HumanDecisionNote);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persisted = await db.AiRecommendations.AsNoTracking()
            .SingleAsync(r => r.RecommendationId == SyntheticRecommendationId);
        Assert.Equal(AiRecommendationReviewStatus.Overridden, persisted.ReviewStatus);
        Assert.Equal("Medical", persisted.OverriddenCategory);
        Assert.Equal("Critical", persisted.OverriddenUrgencyLevel);
        Assert.Equal(ReviewerUserId, persisted.ReviewedByUserId);
        Assert.NotNull(persisted.ReviewedAt);
        Assert.Equal("Escalated after triage nurse confirmation.", persisted.HumanDecisionNote);

        await AssertCitizenRequestUnchangedAsync(db);

        var audit = await db.AuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(ReviewerUserId, audit.ActorUserId);
        Assert.Equal("AiRecommendation.Overridden", audit.Action);
        Assert.Equal("AiRecommendation", audit.EntityType);
        Assert.Equal(SyntheticRecommendationId.ToString(), audit.EntityId);
        Assert.Contains("Overridden", audit.Summary);
        AssertNoSensitivePiiInAudit(audit);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario C: Authorized reviewer - Reject ---

    [Fact]
    public async Task ReviewEndpoint_AuthorizedReviewer_Reject_Returns200PersistsRejectedPreservesCitizenRequestAndRecordsAuditLog()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Rejected",
                HumanDecisionNote = "Insufficient operational evidence for suggested stock."
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AiRecommendationResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal("Rejected", body.ReviewStatus);
        Assert.Equal(ReviewerUserId, body.ReviewedByUserId);
        Assert.NotNull(body.ReviewedAt);
        Assert.Null(body.OverriddenCategory);
        Assert.Null(body.OverriddenUrgencyLevel);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persisted = await db.AiRecommendations.AsNoTracking()
            .SingleAsync(r => r.RecommendationId == SyntheticRecommendationId);
        Assert.Equal(AiRecommendationReviewStatus.Rejected, persisted.ReviewStatus);
        Assert.Equal(ReviewerUserId, persisted.ReviewedByUserId);
        Assert.NotNull(persisted.ReviewedAt);
        Assert.Equal("Insufficient operational evidence for suggested stock.", persisted.HumanDecisionNote);

        await AssertCitizenRequestUnchangedAsync(db);

        var audit = await db.AuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(ReviewerUserId, audit.ActorUserId);
        Assert.Equal("AiRecommendation.Rejected", audit.Action);
        Assert.Equal("AiRecommendation", audit.EntityType);
        Assert.Equal(SyntheticRecommendationId.ToString(), audit.EntityId);
        Assert.Contains("Rejected", audit.Summary);
        AssertNoSensitivePiiInAudit(audit);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario D: Unauthorized Citizen (403 Forbidden) ---

    [Fact]
    public async Task ReviewEndpoint_UnauthorizedCitizen_Returns403AndLeavesDatabaseUnchanged()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(CitizenUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Unauthorized citizen attempt."
            });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario E: Unauthenticated caller (401 Unauthorized) ---

    [Fact]
    public async Task ReviewEndpoint_Unauthenticated_Returns401AndLeavesDatabaseUnchanged()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAnonymousClient();

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Anonymous attempt."
            });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario F: Duplicate review protection ---

    [Fact]
    public async Task ReviewEndpoint_DuplicateReview_Returns400AndPreservesOriginalDecisionAndSingleAuditLog()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var firstResponse = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Initial approval."
            });
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var secondResponse = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Rejected",
                HumanDecisionNote = "Second review attempt should fail."
            });
        Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);

        var problem = await secondResponse.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(problem);
        Assert.Equal(400, problem.Status);
        Assert.Contains("already been reviewed", problem.Detail, StringComparison.OrdinalIgnoreCase);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persisted = await db.AiRecommendations.AsNoTracking()
            .SingleAsync(r => r.RecommendationId == SyntheticRecommendationId);
        Assert.Equal(AiRecommendationReviewStatus.Approved, persisted.ReviewStatus);
        Assert.Equal("Initial approval.", persisted.HumanDecisionNote);

        await AssertCitizenRequestUnchangedAsync(db);

        var audits = await db.AuditLogs.AsNoTracking().ToListAsync();
        Assert.Single(audits);
        Assert.Equal("AiRecommendation.Approved", audits[0].Action);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario G: Invalid review payloads ---

    [Theory]
    [InlineData("PendingReview")]
    [InlineData("InvalidDecision")]
    [InlineData("1")]
    [InlineData("")]
    public async Task ReviewEndpoint_InvalidDecision_Returns400AndLeavesDatabaseUnchanged(string invalidDecision)
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = invalidDecision,
                HumanDecisionNote = "Invalid decision test."
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task ReviewEndpoint_OverrideWithoutCategoryOrUrgency_Returns400AndLeavesDatabaseUnchanged()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Overridden",
                HumanDecisionNote = "Missing both override fields."
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task ReviewEndpoint_OverrideWithInvalidUrgency_Returns400AndLeavesDatabaseUnchanged()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Overridden",
                OverriddenUrgencyLevel = "Extreme"
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task ReviewEndpoint_OverrideWithOversizedCategory_Returns400AndLeavesDatabaseUnchanged()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            $"/api/AiRecommendations/{SyntheticRecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Overridden",
                OverriddenCategory = new string('A', 101)
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Scenario H: Missing recommendation (404 Not Found) ---

    [Fact]
    public async Task ReviewEndpoint_MissingRecommendation_Returns404AndLeavesDatabaseIntact()
    {
        await using var env = await ApiReviewTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(ReviewerUserId);

        var response = await client.PatchAsJsonAsync(
            "/api/AiRecommendations/999999/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Non-existent recommendation."
            });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(problem);
        Assert.Equal(404, problem.Status);

        await AssertRecommendationStillPendingWithNoAuditAsync(env);
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // --- Shared Assertion Helpers ---

    private static async Task AssertRecommendationStillPendingWithNoAuditAsync(ApiReviewTestEnvironment env)
    {
        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persisted = await db.AiRecommendations.AsNoTracking()
            .SingleAsync(r => r.RecommendationId == SyntheticRecommendationId);
        Assert.Equal(AiRecommendationReviewStatus.PendingReview, persisted.ReviewStatus);
        Assert.Null(persisted.ReviewedByUserId);
        Assert.Null(persisted.ReviewedAt);
        Assert.Null(persisted.HumanDecisionNote);
        Assert.Null(persisted.OverriddenCategory);
        Assert.Null(persisted.OverriddenUrgencyLevel);

        await AssertCitizenRequestUnchangedAsync(db);
        Assert.Empty(await db.AuditLogs.AsNoTracking().ToListAsync());
    }

    private static async Task AssertCitizenRequestUnchangedAsync(ApplicationDbContext db)
    {
        var request = await db.CitizenRequests.AsNoTracking()
            .SingleAsync(r => r.RequestId == SyntheticRequestId);

        Assert.Equal("Pending", request.Status);
        Assert.Equal("Food", request.RequestType);
        Assert.Equal("High", request.UrgencyLevel);
        Assert.Equal(6, request.PeopleCount);
        Assert.Equal(SyntheticSensitiveDescription, request.Description);
        Assert.Equal(SyntheticSensitiveAddress, request.Address);
        Assert.Null(request.UpdatedAt);
    }

    private static void AssertNoSensitivePiiInAudit(AuditLog audit)
    {
        Assert.DoesNotContain(SyntheticSensitiveDescription, audit.Summary, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(SyntheticSensitiveAddress, audit.Summary, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("0771234567", audit.Summary, StringComparison.Ordinal);
        Assert.DoesNotContain("901234567V", audit.Summary, StringComparison.OrdinalIgnoreCase);
    }

    // --- Isolated Test Host & SQLite In-Memory Environment ---

    private sealed class ApiReviewTestEnvironment : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AiReviewWebApplicationFactory _factory;

        public TrackingFakeAiAnalysisProvider FakeAiProvider { get; }

        private ApiReviewTestEnvironment(
            SqliteConnection connection,
            AiReviewWebApplicationFactory factory,
            TrackingFakeAiAnalysisProvider fakeAiProvider)
        {
            _connection = connection;
            _factory = factory;
            FakeAiProvider = fakeAiProvider;
        }

        public static async Task<ApiReviewTestEnvironment> CreateAsync()
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var fakeProvider = new TrackingFakeAiAnalysisProvider();
            var factory = new AiReviewWebApplicationFactory(connection, fakeProvider);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.EnsureCreatedAsync();

                var now = new DateTime(2026, 11, 24, 0, 0, 0, DateTimeKind.Utc);

                db.Areas.Add(new Area
                {
                    AreaId = SyntheticAreaId,
                    AreaName = "Synthetic Flood District",
                    AreaType = "District",
                    IsActive = true
                });

                db.Users.AddRange(
                    new User
                    {
                        UserId = CitizenUserId,
                        FullName = "Synthetic Citizen",
                        Email = "synthetic.citizen@test.local",
                        PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                        PhoneNumber = "0000000001",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new User
                    {
                        UserId = ReviewerUserId,
                        FullName = "Synthetic Reviewer",
                        Email = "synthetic.reviewer@test.local",
                        PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                        PhoneNumber = "0000000002",
                        IsActive = true,
                        CreatedAt = now
                    });

                // RoleId 1 = Citizen (no AI.Review), RoleId 2 = Administrator (has AI.View = 32 and AI.Review = 33)
                db.UserRoles.AddRange(
                    new UserRole { UserId = CitizenUserId, RoleId = 1 },
                    new UserRole { UserId = ReviewerUserId, RoleId = 2 });

                db.CitizenRequests.Add(new CitizenRequest
                {
                    RequestId = SyntheticRequestId,
                    UserId = CitizenUserId,
                    AreaId = SyntheticAreaId,
                    RequestType = "Food",
                    Description = SyntheticSensitiveDescription,
                    UrgencyLevel = "High",
                    PeopleCount = 6,
                    Status = "Pending",
                    Address = SyntheticSensitiveAddress,
                    CreatedAt = now
                });

                db.AiRecommendations.Add(new AiRecommendation
                {
                    RecommendationId = SyntheticRecommendationId,
                    CitizenRequestId = SyntheticRequestId,
                    SuggestedCategory = "Food",
                    SuggestedUrgencyLevel = "Critical",
                    IsPotentialDuplicate = false,
                    ConfidenceScore = 0.91m,
                    Explanation = "Synthetic advisory recommendation for API E2E testing.",
                    ProviderName = "Groq",
                    ModelVersion = "openai/gpt-oss-120b",
                    ReviewStatus = AiRecommendationReviewStatus.PendingReview,
                    CreatedAt = now
                });

                await db.SaveChangesAsync();
            }

            return new ApiReviewTestEnvironment(connection, factory, fakeProvider);
        }

        public HttpClient CreateAnonymousClient()
        {
            return _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });
        }

        public HttpClient CreateAuthenticatedClient(int userId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var jwtTokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

            var user = db.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Single(u => u.UserId == userId);

            var auth = jwtTokenService.GenerateToken(user);

            var client = CreateAnonymousClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", auth.AccessToken);
            return client;
        }

        public AsyncServiceScope CreateVerificationScope() => _factory.Services.CreateAsyncScope();

        public async ValueTask DisposeAsync()
        {
            await _factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    private sealed class AiReviewWebApplicationFactory : WebApplicationFactory<Program>
    {
        private readonly SqliteConnection _connection;
        private readonly TrackingFakeAiAnalysisProvider _fakeAiProvider;
        private readonly string _ephemeralJwtKeyBase64;

        public AiReviewWebApplicationFactory(
            SqliteConnection connection,
            TrackingFakeAiAnalysisProvider fakeAiProvider)
        {
            _connection = connection;
            _fakeAiProvider = fakeAiProvider;

            var keyBytes = new byte[32];
            RandomNumberGenerator.Fill(keyBytes);
            _ephemeralJwtKeyBase64 = Convert.ToBase64String(keyBytes);
        }

        private const string TestIssuer = "HumanitarianCrisisManagementAPI.Test";
        private const string TestAudience = "HumanitarianCrisisManagementClient.Test";

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            // Non-Development environment prevents Program.cs from executing SQL Server db.Database.Migrate()
            builder.UseEnvironment("Testing");

            builder.UseSetting("ConnectionStrings:DefaultConnection", "DataSource=:memory:");
            builder.UseSetting("Jwt:Key", _ephemeralJwtKeyBase64);
            builder.UseSetting("Jwt:Issuer", TestIssuer);
            builder.UseSetting("Jwt:Audience", TestAudience);
            builder.UseSetting("Jwt:AccessTokenExpirationMinutes", "30");
            builder.UseSetting("AiProvider:Provider", "None");
            builder.UseSetting("AiProvider:GroqApiKey", string.Empty);
            builder.UseSetting("AiProvider:GeminiApiKey", string.Empty);
            builder.UseSetting("AiProvider:IncludeSanitizedDescriptions", "false");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                    ["Jwt:Key"] = _ephemeralJwtKeyBase64,
                    ["Jwt:Issuer"] = TestIssuer,
                    ["Jwt:Audience"] = TestAudience,
                    ["Jwt:AccessTokenExpirationMinutes"] = "30",
                    ["AiProvider:Provider"] = "None",
                    ["AiProvider:GroqApiKey"] = string.Empty,
                    ["AiProvider:GeminiApiKey"] = string.Empty,
                    ["AiProvider:IncludeSanitizedDescriptions"] = "false"
                });
            });

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                services.RemoveAll<ApplicationDbContext>();

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlite(_connection));

                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.TokenValidationParameters.IssuerSigningKey =
                        new SymmetricSecurityKey(Convert.FromBase64String(_ephemeralJwtKeyBase64));
                    options.TokenValidationParameters.ValidIssuer = TestIssuer;
                    options.TokenValidationParameters.ValidAudience = TestAudience;
                });

                services.RemoveAll<IAiAnalysisProvider>();
                services.AddSingleton<IAiAnalysisProvider>(_fakeAiProvider);
            });
        }
    }

    private sealed class TrackingFakeAiAnalysisProvider : IAiAnalysisProvider
    {
        public int CallCount { get; private set; }

        public bool IsConfigured => false;
        public string ProviderName => "TestFake";

        public Task<AiAnalysisResult> AnalyzeCitizenRequestAsync(
            AiAnalysisContext context,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            throw new InvalidOperationException("External AI provider must never be called during review tests.");
        }

        public Task<AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            throw new InvalidOperationException("External AI diagnostic must never be called during review tests.");
        }
    }
}
