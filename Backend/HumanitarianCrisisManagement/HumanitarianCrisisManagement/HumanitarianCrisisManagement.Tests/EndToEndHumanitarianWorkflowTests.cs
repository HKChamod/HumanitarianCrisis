using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Application.DTOs.AuditLogs;
using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;
using HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;
using HumanitarianCrisisManagement.Application.Exceptions;
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
/// Full 11-step End-to-End Humanitarian Crisis Response Workflow API Integration Tests.
/// Verifies: Citizen Register/Login -> Citizen Request Submission -> AI Advisory Analysis ->
/// Human Review -> Resource Allocation & Dispatch -> Inventory Consistency ->
/// Citizen Request Tracking -> Audit Trail, plus graceful degradation when AI is unavailable.
/// </summary>
public class EndToEndHumanitarianWorkflowTests
{
    private const int AdminUserId = 9201;
    private const int SyntheticAreaId = 9201;
    private const int ActiveCrisisId = 9201;
    private const int SyntheticResourceId = 9201;
    private const int SyntheticWarehouseId = 9201;
    private const int SyntheticInventoryId = 9201;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public async Task PrimaryWorkflow_Full11StepEndToEnd_SucceedsWithConsistentInventoryTrackingAndAuditTrail()
    {
        var stubProvider = new ConfigurableStubAiProvider(shouldFailUnavailable: false, suggestedInventoryId: SyntheticInventoryId);
        await using var env = await E2eWorkflowEnvironment.CreateAsync(stubProvider, initialStock: 100m);

        using var anonClient = env.CreateAnonymousClient();

        // Step 1: Citizen registers and logs in via real AuthController endpoints
        var registerRes = await anonClient.PostAsJsonAsync(
            "/api/Auth/register",
            new RegisterRequest
            {
                FullName = "Synthetic E2E Citizen",
                Email = "e2e.citizen@test.local",
                Password = "SyntheticPassword!123",
                PhoneNumber = "0700000001"
            });
        Assert.Equal(HttpStatusCode.Created, registerRes.StatusCode);

        var loginRes = await anonClient.PostAsJsonAsync(
            "/api/Auth/login",
            new LoginRequest
            {
                Email = "e2e.citizen@test.local",
                Password = "SyntheticPassword!123"
            });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var citizenAuth = await loginRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(citizenAuth);
        Assert.False(string.IsNullOrWhiteSpace(citizenAuth.AccessToken));

        using var citizenClient = env.CreateClientWithToken(citizenAuth.AccessToken);

        // Step 2: Citizen submits a humanitarian assistance request
        var createReqRes = await citizenClient.PostAsJsonAsync(
            "/api/CitizenRequests",
            new CreateCitizenRequest
            {
                RequestType = "Food",
                Description = "Synthetic family stranded by rising floodwaters needing dry rations.",
                UrgencyLevel = "High",
                PeopleCount = 5,
                AreaId = SyntheticAreaId,
                CrisisId = ActiveCrisisId,
                Address = "Synthetic Riverbank Sector 4"
            });
        Assert.Equal(HttpStatusCode.Created, createReqRes.StatusCode);

        var createdRequest = await createReqRes.Content.ReadFromJsonAsync<CitizenRequestResponse>(JsonOptions);
        Assert.NotNull(createdRequest);
        Assert.Equal("Pending", createdRequest.Status);

        // Citizen cannot invoke AI analysis or review (403 Forbidden)
        var citizenAiAttempt = await citizenClient.PostAsync(
            $"/api/AiRecommendations/analyze/{createdRequest.RequestId}",
            content: null);
        Assert.Equal(HttpStatusCode.Forbidden, citizenAiAttempt.StatusCode);

        // Step 4 & 5: Authorized Coordinator triggers AI advisory analysis and retrieves recommendation
        using var coordinatorClient = env.CreateAuthenticatedClient(AdminUserId);

        var analyzeRes = await coordinatorClient.PostAsync(
            $"/api/AiRecommendations/analyze/{createdRequest.RequestId}",
            content: null);
        Assert.Equal(HttpStatusCode.Created, analyzeRes.StatusCode);

        var aiRec = await analyzeRes.Content.ReadFromJsonAsync<AiRecommendationResponse>(JsonOptions);
        Assert.NotNull(aiRec);
        Assert.Equal(createdRequest.RequestId, aiRec.CitizenRequestId);
        Assert.Equal("PendingReview", aiRec.ReviewStatus);
        Assert.Equal(SyntheticInventoryId, aiRec.SuggestedInventoryId);
        Assert.Equal(30m, aiRec.SuggestedResourceQuantity);

        var getRecRes = await coordinatorClient.GetAsync($"/api/AiRecommendations/{aiRec.RecommendationId}");
        Assert.Equal(HttpStatusCode.OK, getRecRes.StatusCode);

        // Guardrail check: AI analysis NEVER auto-allocates or mutates inventory
        await using (var midScope = env.CreateVerificationScope())
        {
            var midDb = midScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            Assert.Empty(await midDb.ResourceAllocations.AsNoTracking().ToListAsync());
            Assert.Equal(100m, (await midDb.WarehouseInventories.AsNoTracking().SingleAsync()).QuantityAvailable);
        }

        // Step 6 & 7: Coordinator reviews and approves the AI recommendation
        var reviewRes = await coordinatorClient.PatchAsJsonAsync(
            $"/api/AiRecommendations/{aiRec.RecommendationId}/review",
            new ReviewAiRecommendationRequest
            {
                Decision = "Approved",
                HumanDecisionNote = "Verified food pack availability with depot manager."
            });
        Assert.Equal(HttpStatusCode.OK, reviewRes.StatusCode);

        var reviewed = await reviewRes.Content.ReadFromJsonAsync<AiRecommendationResponse>(JsonOptions);
        Assert.NotNull(reviewed);
        Assert.Equal("Approved", reviewed.ReviewStatus);
        Assert.Equal(AdminUserId, reviewed.ReviewedByUserId);
        Assert.NotNull(reviewed.ReviewedAt);

        // Step 8 & 9: Coordinator creates, approves, and dispatches Resource Allocation -> updates inventory atomically
        var allocRes = await coordinatorClient.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                CitizenRequestId = createdRequest.RequestId,
                QuantityRequested = 30m,
                ReferenceNumber = "SYN-E2E-001",
                Notes = "Approved following AI recommendation review."
            });
        Assert.Equal(HttpStatusCode.Created, allocRes.StatusCode);
        var allocation = (await allocRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{allocation.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 30m })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{allocation.AllocationId}/dispatch",
            new UpdateResourceAllocationStatusRequest { Notes = "Dispatched via relief truck." })).StatusCode);

        // Step 10: Coordinator updates CitizenRequest status (Pending -> Verified -> Assigned -> Fulfilled) and Citizen tracks it
        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/CitizenRequests/{createdRequest.RequestId}/status",
            new UpdateCitizenRequestStatus { Status = "Verified" })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/CitizenRequests/{createdRequest.RequestId}/status",
            new UpdateCitizenRequestStatus { Status = "Assigned" })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/CitizenRequests/{createdRequest.RequestId}/status",
            new UpdateCitizenRequestStatus { Status = "Fulfilled" })).StatusCode);

        var myReqsRes = await citizenClient.GetAsync("/api/CitizenRequests/my");
        Assert.Equal(HttpStatusCode.OK, myReqsRes.StatusCode);
        var myReqs = await myReqsRes.Content.ReadFromJsonAsync<List<CitizenRequestResponse>>(JsonOptions);
        Assert.NotNull(myReqs);
        var tracked = Assert.Single(myReqs);
        Assert.Equal(createdRequest.RequestId, tracked.RequestId);
        Assert.Equal("Fulfilled", tracked.Status);

        // Step 11: Coordinator retrieves Audit Logs via API and verifies full audit trail + inventory persistence
        var auditRes = await coordinatorClient.GetAsync("/api/AuditLogs?limit=50");
        Assert.Equal(HttpStatusCode.OK, auditRes.StatusCode);
        var auditLogs = await auditRes.Content.ReadFromJsonAsync<List<AuditLogResponse>>(JsonOptions);
        Assert.NotNull(auditLogs);

        var actions = auditLogs.Select(a => a.Action).ToList();
        Assert.Contains("AiRecommendation.Generated", actions);
        Assert.Contains("AiRecommendation.Approved", actions);
        Assert.Contains("ResourceAllocation.Created", actions);
        Assert.Contains("ResourceAllocation.Approved", actions);
        Assert.Contains("ResourceAllocation.Dispatched", actions);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(70m, (await db.WarehouseInventories.AsNoTracking().SingleAsync()).QuantityAvailable);
        var stockTx = await db.InventoryTransactions.AsNoTracking().SingleAsync();
        Assert.Equal(InventoryTransactionType.StockOut, stockTx.TransactionType);
        Assert.Equal(30m, stockTx.Quantity);
        Assert.Equal(100m, stockTx.PreviousQuantity);
        Assert.Equal(70m, stockTx.NewQuantity);
    }

    [Fact]
    public async Task PrimaryWorkflow_WhenAiProviderUnavailable_CitizenRequestAndManualAllocationStillSucceed()
    {
        var failingProvider = new ConfigurableStubAiProvider(shouldFailUnavailable: true, suggestedInventoryId: SyntheticInventoryId);
        await using var env = await E2eWorkflowEnvironment.CreateAsync(failingProvider, initialStock: 50m);

        using var anonClient = env.CreateAnonymousClient();

        // Register & login citizen
        var regRes = await anonClient.PostAsJsonAsync(
            "/api/Auth/register",
            new RegisterRequest
            {
                FullName = "Synthetic Fallback Citizen",
                Email = "e2e.fallback@test.local",
                Password = "SyntheticPassword!123"
            });
        Assert.Equal(HttpStatusCode.Created, regRes.StatusCode);
        var citizenAuth = (await regRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions))!;

        using var citizenClient = env.CreateClientWithToken(citizenAuth.AccessToken);

        // Step 3: Citizen request creation succeeds even when AI provider is down
        var reqRes = await citizenClient.PostAsJsonAsync(
            "/api/CitizenRequests",
            new CreateCitizenRequest
            {
                RequestType = "Water",
                Description = "Synthetic request submitted during simulated AI outage.",
                UrgencyLevel = "Critical",
                PeopleCount = 4,
                AreaId = SyntheticAreaId,
                CrisisId = ActiveCrisisId
            });
        Assert.Equal(HttpStatusCode.Created, reqRes.StatusCode);
        var createdRequest = (await reqRes.Content.ReadFromJsonAsync<CitizenRequestResponse>(JsonOptions))!;

        // Coordinator calls AI analyze -> receives clean 503 Service Unavailable without corrupting DB
        using var coordinatorClient = env.CreateAuthenticatedClient(AdminUserId);
        var aiRes = await coordinatorClient.PostAsync(
            $"/api/AiRecommendations/analyze/{createdRequest.RequestId}",
            content: null);
        Assert.Equal(HttpStatusCode.ServiceUnavailable, aiRes.StatusCode);

        // Coordinator can still manually allocate & dispatch stock while AI is offline
        var allocRes = await coordinatorClient.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                CitizenRequestId = createdRequest.RequestId,
                QuantityRequested = 15m
            });
        Assert.Equal(HttpStatusCode.Created, allocRes.StatusCode);
        var alloc = (await allocRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{alloc.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 15m })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await coordinatorClient.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{alloc.AllocationId}/dispatch",
            new UpdateResourceAllocationStatusRequest { Notes = "Manual dispatch during AI outage." })).StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await db.AiRecommendations.AsNoTracking().ToListAsync());
        Assert.Equal(35m, (await db.WarehouseInventories.AsNoTracking().SingleAsync()).QuantityAvailable);
    }

    [Fact]
    public async Task HealthEndpoint_Returns200Healthy()
    {
        var stubProvider = new ConfigurableStubAiProvider(shouldFailUnavailable: false, suggestedInventoryId: SyntheticInventoryId);
        await using var env = await E2eWorkflowEnvironment.CreateAsync(stubProvider);
        using var client = env.CreateAnonymousClient();

        var response = await client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Equal("Healthy", body);
    }

    // =========================================================================
    // Isolated SQLite In-Memory Test Host
    // =========================================================================

    private sealed class E2eWorkflowEnvironment : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly E2eWebApplicationFactory _factory;

        private E2eWorkflowEnvironment(SqliteConnection connection, E2eWebApplicationFactory factory)
        {
            _connection = connection;
            _factory = factory;
        }

        public static async Task<E2eWorkflowEnvironment> CreateAsync(
            IAiAnalysisProvider aiProvider,
            decimal initialStock = 100m)
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var factory = new E2eWebApplicationFactory(connection, aiProvider);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.EnsureCreatedAsync();

                var now = new DateTime(2026, 11, 24, 0, 0, 0, DateTimeKind.Utc);

                db.Areas.Add(new Area
                {
                    AreaId = SyntheticAreaId,
                    AreaName = "Synthetic E2E District",
                    AreaType = "District",
                    IsActive = true
                });

                db.Users.Add(new User
                {
                    UserId = AdminUserId,
                    FullName = "Synthetic E2E Coordinator",
                    Email = "synthetic.coordinator.e2e@test.local",
                    PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                    IsActive = true,
                    CreatedAt = now
                });

                db.UserRoles.Add(new UserRole { UserId = AdminUserId, RoleId = 2 });

                db.CrisisEvents.Add(new CrisisEvent
                {
                    CrisisId = ActiveCrisisId,
                    CrisisName = "Synthetic Flood E2E 2026",
                    CrisisType = "Flood",
                    Description = "Synthetic active crisis for E2E verification.",
                    SeverityLevel = "High",
                    StartDate = now,
                    Status = "Active"
                });

                db.Resources.Add(new Resource
                {
                    ResourceId = SyntheticResourceId,
                    ResourceName = "Synthetic Emergency Ration Kit",
                    ResourceCategory = "Food",
                    UnitOfMeasure = "Kit",
                    IsPerishable = false,
                    IsActive = true,
                    CreatedAt = now
                });

                db.Warehouses.Add(new Warehouse
                {
                    WarehouseId = SyntheticWarehouseId,
                    WarehouseName = "Synthetic E2E Central Depot",
                    WarehouseCode = "SYN-E2E-WH",
                    Address = "Synthetic Logistics Park",
                    AreaId = SyntheticAreaId,
                    IsActive = true,
                    CreatedAt = now
                });

                db.WarehouseInventories.Add(new WarehouseInventory
                {
                    InventoryId = SyntheticInventoryId,
                    WarehouseId = SyntheticWarehouseId,
                    ResourceId = SyntheticResourceId,
                    QuantityAvailable = initialStock,
                    ReorderLevel = 10m,
                    LastUpdatedAt = now
                });

                await db.SaveChangesAsync();
            }

            return new E2eWorkflowEnvironment(connection, factory);
        }

        public HttpClient CreateAnonymousClient() =>
            _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

        public HttpClient CreateClientWithToken(string accessToken)
        {
            var client = CreateAnonymousClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            return client;
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

            return CreateClientWithToken(jwtTokenService.GenerateToken(user).AccessToken);
        }

        public AsyncServiceScope CreateVerificationScope() => _factory.Services.CreateAsyncScope();

        public async ValueTask DisposeAsync()
        {
            await _factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    private sealed class E2eWebApplicationFactory : WebApplicationFactory<Program>
    {
        private const string TestIssuer = "HumanitarianCrisisManagementAPI.E2eTest";
        private const string TestAudience = "HumanitarianCrisisManagementClient.E2eTest";

        private readonly SqliteConnection _connection;
        private readonly IAiAnalysisProvider _aiProvider;
        private readonly string _ephemeralJwtKeyBase64;

        public E2eWebApplicationFactory(SqliteConnection connection, IAiAnalysisProvider aiProvider)
        {
            _connection = connection;
            _aiProvider = aiProvider;

            var keyBytes = new byte[32];
            RandomNumberGenerator.Fill(keyBytes);
            _ephemeralJwtKeyBase64 = Convert.ToBase64String(keyBytes);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.UseSetting("ConnectionStrings:DefaultConnection", "DataSource=:memory:");
            builder.UseSetting("Jwt:Key", _ephemeralJwtKeyBase64);
            builder.UseSetting("Jwt:Issuer", TestIssuer);
            builder.UseSetting("Jwt:Audience", TestAudience);
            builder.UseSetting("Jwt:AccessTokenExpirationMinutes", "30");
            builder.UseSetting("AiProvider:Provider", "None");
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
                services.AddSingleton(_aiProvider);
            });
        }
    }

    private sealed class ConfigurableStubAiProvider : IAiAnalysisProvider
    {
        private readonly bool _shouldFailUnavailable;
        private readonly int _suggestedInventoryId;

        public ConfigurableStubAiProvider(bool shouldFailUnavailable, int suggestedInventoryId)
        {
            _shouldFailUnavailable = shouldFailUnavailable;
            _suggestedInventoryId = suggestedInventoryId;
        }

        public bool IsConfigured => !_shouldFailUnavailable;
        public string ProviderName => "StubProvider";

        public Task<AiAnalysisResult> AnalyzeCitizenRequestAsync(
            AiAnalysisContext context,
            CancellationToken cancellationToken = default)
        {
            if (_shouldFailUnavailable)
            {
                throw new AiProviderUnavailableException("Simulated temporary AI provider outage (503).");
            }

            return Task.FromResult(new AiAnalysisResult
            {
                SuggestedCategory = "Food",
                SuggestedUrgencyLevel = "High",
                IsPotentialDuplicate = false,
                SuggestedInventoryId = _suggestedInventoryId,
                SuggestedResourceQuantity = 30m,
                ConfidenceScore = 0.89m,
                Explanation = "Synthetic advisory analysis recommending 30 ration kits from available depot stock.",
                ProviderName = "StubProvider",
                ModelVersion = "synthetic-e2e-v1"
            });
        }

        public Task<AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
            CancellationToken cancellationToken = default)
        {
            if (_shouldFailUnavailable)
            {
                throw new AiProviderUnavailableException("Simulated temporary AI provider outage (503).");
            }

            return Task.FromResult(new AiProviderDiagnosticResponse
            {
                ProviderName = ProviderName,
                Success = true,
                Message = "Stub diagnostic succeeded."
            });
        }
    }
}
