using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

/// <summary>
/// Isolated SQLite in-memory persistence integration tests for <see cref="AiDecisionSupportService.ReviewAsync"/>.
/// Verifies database persistence, state-transition guards, CitizenRequest immutability, and AuditLog recording
/// without touching SQL Server (HumanitarianCrisisDB) or invoking any live AI provider.
/// </summary>
public class AiRecommendationReviewPersistenceTests
{
    private const int CitizenUserId = 9001;
    private const int ReviewerUserId = 9002;
    private const int InactiveReviewerUserId = 9003;
    private const int SyntheticAreaId = 9001;
    private const int SyntheticRequestId = 9001;
    private const int SyntheticRecommendationId = 9001;
    private const string SyntheticSensitiveDescription = "SYNTHETIC-FREE-TEXT-0771234567-901234567V";
    private const string SyntheticSensitiveAddress = "SYNTHETIC-PRIVATE-ADDRESS-42";

    [Fact]
    public async Task ReviewAsync_Approve_PersistsDecisionPreservesCitizenRequestAndRecordsAuditLog()
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        var response = await env.Service.ReviewAsync(
            SyntheticRecommendationId,
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Verified against field dispatch log."
            },
            ReviewerUserId);

        Assert.Equal("Approved", response.ReviewStatus);
        Assert.Equal(ReviewerUserId, response.ReviewedByUserId);
        Assert.NotNull(response.ReviewedAt);

        // Reload via fresh DbContext to prove real relational persistence
        await using var verifyCtx = env.CreateFreshContext();
        var persisted = await verifyCtx.AiRecommendations.AsNoTracking()
            .FirstAsync(r => r.RecommendationId == SyntheticRecommendationId);

        Assert.Equal(AiRecommendationReviewStatus.Approved, persisted.ReviewStatus);
        Assert.Equal(ReviewerUserId, persisted.ReviewedByUserId);
        Assert.NotNull(persisted.ReviewedAt);
        Assert.NotNull(persisted.UpdatedAt);
        Assert.Equal("Verified against field dispatch log.", persisted.HumanDecisionNote);
        Assert.Null(persisted.OverriddenCategory);
        Assert.Null(persisted.OverriddenUrgencyLevel);

        await AssertCitizenRequestUnchangedAsync(verifyCtx);

        var audit = await verifyCtx.AuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(ReviewerUserId, audit.ActorUserId);
        Assert.Equal("AiRecommendation.Approved", audit.Action);
        Assert.Equal("AiRecommendation", audit.EntityType);
        Assert.Equal(SyntheticRecommendationId.ToString(), audit.EntityId);
        Assert.Contains($"#{SyntheticRecommendationId}", audit.Summary);
        Assert.Contains($"#{SyntheticRequestId}", audit.Summary);
        Assert.Contains("Approved", audit.Summary);
        AssertNoSensitivePiiInAudit(audit);
    }

    [Fact]
    public async Task ReviewAsync_Override_PersistsOverrideFieldsPreservesCitizenRequestAndRecordsAuditLog()
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        var response = await env.Service.ReviewAsync(
            SyntheticRecommendationId,
            new ReviewAiRecommendationRequest
            {
                Decision = "Overridden",
                OverriddenCategory = "Medical",
                OverriddenUrgencyLevel = "Critical",
                HumanDecisionNote = "Escalated to medical priority after verification."
            },
            ReviewerUserId);

        Assert.Equal("Overridden", response.ReviewStatus);
        Assert.Equal("Medical", response.OverriddenCategory);
        Assert.Equal("Critical", response.OverriddenUrgencyLevel);

        await using var verifyCtx = env.CreateFreshContext();
        var persisted = await verifyCtx.AiRecommendations.AsNoTracking()
            .FirstAsync(r => r.RecommendationId == SyntheticRecommendationId);

        Assert.Equal(AiRecommendationReviewStatus.Overridden, persisted.ReviewStatus);
        Assert.Equal("Medical", persisted.OverriddenCategory);
        Assert.Equal("Critical", persisted.OverriddenUrgencyLevel);
        Assert.Equal(ReviewerUserId, persisted.ReviewedByUserId);
        Assert.NotNull(persisted.ReviewedAt);
        Assert.Equal("Escalated to medical priority after verification.", persisted.HumanDecisionNote);

        await AssertCitizenRequestUnchangedAsync(verifyCtx);

        var audit = await verifyCtx.AuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(ReviewerUserId, audit.ActorUserId);
        Assert.Equal("AiRecommendation.Overridden", audit.Action);
        Assert.Equal("AiRecommendation", audit.EntityType);
        Assert.Equal(SyntheticRecommendationId.ToString(), audit.EntityId);
        Assert.Contains("Overridden", audit.Summary);
        AssertNoSensitivePiiInAudit(audit);
    }

    [Fact]
    public async Task ReviewAsync_Reject_PersistsRejectedStatusPreservesCitizenRequestAndRecordsAuditLog()
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        var response = await env.Service.ReviewAsync(
            SyntheticRecommendationId,
            new ReviewAiRecommendationRequest
            {
                Decision = "Rejected",
                HumanDecisionNote = "AI suggestion does not match field report."
            },
            ReviewerUserId);

        Assert.Equal("Rejected", response.ReviewStatus);
        Assert.Null(response.OverriddenCategory);
        Assert.Null(response.OverriddenUrgencyLevel);

        await using var verifyCtx = env.CreateFreshContext();
        var persisted = await verifyCtx.AiRecommendations.AsNoTracking()
            .FirstAsync(r => r.RecommendationId == SyntheticRecommendationId);

        Assert.Equal(AiRecommendationReviewStatus.Rejected, persisted.ReviewStatus);
        Assert.Equal(ReviewerUserId, persisted.ReviewedByUserId);
        Assert.NotNull(persisted.ReviewedAt);
        Assert.Equal("AI suggestion does not match field report.", persisted.HumanDecisionNote);

        await AssertCitizenRequestUnchangedAsync(verifyCtx);

        var audit = await verifyCtx.AuditLogs.AsNoTracking().SingleAsync();
        Assert.Equal(ReviewerUserId, audit.ActorUserId);
        Assert.Equal("AiRecommendation.Rejected", audit.Action);
        Assert.Equal("AiRecommendation", audit.EntityType);
        Assert.Equal(SyntheticRecommendationId.ToString(), audit.EntityId);
        Assert.Contains("Rejected", audit.Summary);
        AssertNoSensitivePiiInAudit(audit);
    }

    [Fact]
    public async Task ReviewAsync_DuplicateReviewAttempt_RejectedAndOriginalDecisionNotOverwritten()
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        await env.Service.ReviewAsync(
            SyntheticRecommendationId,
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Initial human approval."
            },
            ReviewerUserId);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            env.Service.ReviewAsync(
                SyntheticRecommendationId,
                new ReviewAiRecommendationRequest
                {
                    Decision = "Rejected",
                    HumanDecisionNote = "Attempted overwrite."
                },
                ReviewerUserId));

        Assert.Contains("already been reviewed", ex.Message, StringComparison.OrdinalIgnoreCase);

        await using var verifyCtx = env.CreateFreshContext();
        var persisted = await verifyCtx.AiRecommendations.AsNoTracking()
            .FirstAsync(r => r.RecommendationId == SyntheticRecommendationId);

        Assert.Equal(AiRecommendationReviewStatus.Approved, persisted.ReviewStatus);
        Assert.Equal("Initial human approval.", persisted.HumanDecisionNote);
        await AssertCitizenRequestUnchangedAsync(verifyCtx);

        // Only the original approval audit entry should exist
        var auditCount = await verifyCtx.AuditLogs.AsNoTracking().CountAsync();
        Assert.Equal(1, auditCount);
    }

    [Theory]
    [InlineData("PendingReview", null, null)]
    [InlineData("InvalidDecision", null, null)]
    [InlineData("1", null, null)]
    [InlineData("", null, null)]
    [InlineData("Overridden", null, null)]
    [InlineData("Overridden", "Medical", "Extreme")]
    public async Task ReviewAsync_InvalidReviewInputs_RejectedWithoutMutatingPersistedData(
        string decision,
        string? overriddenCategory,
        string? overriddenUrgencyLevel)
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            env.Service.ReviewAsync(
                SyntheticRecommendationId,
                new ReviewAiRecommendationRequest
                {
                    Decision = decision,
                    OverriddenCategory = overriddenCategory,
                    OverriddenUrgencyLevel = overriddenUrgencyLevel,
                    HumanDecisionNote = "Invalid test input."
                },
                ReviewerUserId));

        await AssertRecommendationStillPendingAndNoAuditAsync(env);
    }

    [Fact]
    public async Task ReviewAsync_OversizedOverriddenCategory_RejectedWithoutMutatingPersistedData()
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        await Assert.ThrowsAsync<ArgumentException>(() =>
            env.Service.ReviewAsync(
                SyntheticRecommendationId,
                new ReviewAiRecommendationRequest
                {
                    Decision = "Overridden",
                    OverriddenCategory = new string('X', 101)
                },
                ReviewerUserId));

        await AssertRecommendationStillPendingAndNoAuditAsync(env);
    }

    [Fact]
    public async Task ReviewAsync_InactiveReviewer_RejectedWithUnauthorizedWithoutMutatingPersistedData()
    {
        await using var env = await IsolatedSqliteTestEnvironment.CreateAsync();

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            env.Service.ReviewAsync(
                SyntheticRecommendationId,
                new ReviewAiRecommendationRequest { Decision = "Approved" },
                InactiveReviewerUserId));

        await AssertRecommendationStillPendingAndNoAuditAsync(env);
    }

    private static async Task AssertRecommendationStillPendingAndNoAuditAsync(IsolatedSqliteTestEnvironment env)
    {
        await using var verifyCtx = env.CreateFreshContext();
        var persisted = await verifyCtx.AiRecommendations.AsNoTracking()
            .FirstAsync(r => r.RecommendationId == SyntheticRecommendationId);

        Assert.Equal(AiRecommendationReviewStatus.PendingReview, persisted.ReviewStatus);
        Assert.Null(persisted.ReviewedByUserId);
        Assert.Null(persisted.ReviewedAt);
        Assert.Null(persisted.HumanDecisionNote);
        Assert.Null(persisted.OverriddenCategory);
        Assert.Null(persisted.OverriddenUrgencyLevel);

        await AssertCitizenRequestUnchangedAsync(verifyCtx);
        Assert.Equal(0, await verifyCtx.AuditLogs.AsNoTracking().CountAsync());
    }

    private static async Task AssertCitizenRequestUnchangedAsync(ApplicationDbContext ctx)
    {
        var req = await ctx.CitizenRequests.AsNoTracking()
            .FirstAsync(r => r.RequestId == SyntheticRequestId);

        Assert.Equal("Pending", req.Status);
        Assert.Equal("Food", req.RequestType);
        Assert.Equal("High", req.UrgencyLevel);
        Assert.Equal(6, req.PeopleCount);
        Assert.Equal(SyntheticSensitiveDescription, req.Description);
        Assert.Equal(SyntheticSensitiveAddress, req.Address);
    }

    private static void AssertNoSensitivePiiInAudit(AuditLog audit)
    {
        Assert.DoesNotContain("0771234567", audit.Summary);
        Assert.DoesNotContain("901234567V", audit.Summary);
        Assert.DoesNotContain(SyntheticSensitiveDescription, audit.Summary);
        Assert.DoesNotContain(SyntheticSensitiveAddress, audit.Summary);
    }

    private sealed class IsolatedSqliteTestEnvironment : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly DbContextOptions<ApplicationDbContext> _options;
        private readonly ApplicationDbContext _context;

        public AiDecisionSupportService Service { get; }

        private IsolatedSqliteTestEnvironment(
            SqliteConnection connection,
            DbContextOptions<ApplicationDbContext> options,
            ApplicationDbContext context)
        {
            _connection = connection;
            _options = options;
            _context = context;

            var auditLogService = new AuditLogService(context);
            Service = new AiDecisionSupportService(
                context,
                new UnconfiguredAiAnalysisProvider(),
                auditLogService);
        }

        public static async Task<IsolatedSqliteTestEnvironment> CreateAsync()
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var options = new DbContextOptionsBuilder<ApplicationDbContext>()
                .UseSqlite(connection)
                .Options;

            var context = new ApplicationDbContext(options);
            await context.Database.EnsureCreatedAsync();

            SeedSyntheticEntities(context);
            await context.SaveChangesAsync();

            return new IsolatedSqliteTestEnvironment(connection, options, context);
        }

        public ApplicationDbContext CreateFreshContext() => new(_options);

        private static void SeedSyntheticEntities(ApplicationDbContext ctx)
        {
            var now = new DateTime(2026, 11, 24, 0, 0, 0, DateTimeKind.Utc);

            ctx.Areas.Add(new Area
            {
                AreaId = SyntheticAreaId,
                AreaName = "Synthetic Flood District",
                AreaType = "District",
                IsActive = true
            });

            ctx.Users.AddRange(
                new User
                {
                    UserId = CitizenUserId,
                    FullName = "Synthetic Citizen",
                    Email = "synthetic.citizen@test.local",
                    PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                    IsActive = true,
                    CreatedAt = now
                },
                new User
                {
                    UserId = ReviewerUserId,
                    FullName = "Synthetic Reviewer",
                    Email = "synthetic.reviewer@test.local",
                    PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                    IsActive = true,
                    CreatedAt = now
                },
                new User
                {
                    UserId = InactiveReviewerUserId,
                    FullName = "Synthetic Inactive Reviewer",
                    Email = "synthetic.inactive@test.local",
                    PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                    IsActive = false,
                    CreatedAt = now
                });

            ctx.CitizenRequests.Add(new CitizenRequest
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

            ctx.AiRecommendations.Add(new AiRecommendation
            {
                RecommendationId = SyntheticRecommendationId,
                CitizenRequestId = SyntheticRequestId,
                SuggestedCategory = "Food",
                SuggestedUrgencyLevel = "Critical",
                IsPotentialDuplicate = false,
                ConfidenceScore = 0.91m,
                Explanation = "Synthetic advisory recommendation for isolated review persistence test.",
                ProviderName = "Groq",
                ModelVersion = "openai/gpt-oss-120b",
                ReviewStatus = AiRecommendationReviewStatus.PendingReview,
                CreatedAt = now
            });
        }

        public async ValueTask DisposeAsync()
        {
            await _context.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }
}
