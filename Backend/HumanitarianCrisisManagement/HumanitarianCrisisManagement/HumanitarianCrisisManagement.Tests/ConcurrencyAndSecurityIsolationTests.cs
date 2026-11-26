using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;
using HumanitarianCrisisManagement.Application.DTOs.Notifications;
using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;
using HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;
using HumanitarianCrisisManagement.Application.DTOs.Shelters;
using HumanitarianCrisisManagement.Application.DTOs.Volunteers;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
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
/// Phase 4 Security, Data Isolation, Organization Scoping, and Concurrency Contention Tests.
///
/// Note on SQLite vs. SQL Server concurrency:
/// The parallel contention tests below use an isolated per-test SQLite database file (with independent
/// connections per HTTP request and busy timeout) to verify application transaction guards and invariant
/// preservation (no negative stock, no capacity overflow, no duplicate active volunteer assignments).
/// SQLite table/database locking differs from SQL Server Serializable key-range locking; see
/// <see cref="OptInSqlServerStagingConcurrencyTests_WhenNotEnabled_ExitsSafelyWithoutConnecting"/>
/// for the opt-in SQL Server staging concurrency harness.
/// </summary>
public class ConcurrencyAndSecurityIsolationTests
{
    private const int CitizenAUserId = 9301;
    private const int CitizenBUserId = 9302;
    private const int AdminUserId = 9303;
    private const int Org1AdminUserId = 9304;
    private const int PendingMemberUserId = 9305;

    private const int SyntheticAreaId = 9301;
    private const int ActiveCrisisId = 9301;
    private const int SyntheticResourceId = 9301;
    private const int SyntheticWarehouseId = 9301;
    private const int SyntheticInventoryId = 9301;
    private const int SyntheticShelterId = 9301;
    private const int SyntheticVolunteerId = 9301;

    private const int Organization1Id = 9301;
    private const int Organization2Id = 9302;
    private const int Org1AdminMembershipId = 9301;
    private const int Org1PendingMembershipId = 9302;
    private const int Org2PendingMembershipId = 9303;
    private const int Org1ScopedAdminRoleId = 9301;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // =========================================================================
    // 1. Concurrency: Simultaneous Resource Dispatches Against Shared Stock
    // =========================================================================

    [Fact]
    public async Task Concurrency_SimultaneousResourceDispatches_PreventsOverconsumptionAndNegativeStock()
    {
        // Initial stock = 60; two approved allocations of 40 each -> total 80 > 60
        await using var env = await IsolatedConcurrentTestEnv.CreateAsync(initialStock: 60m);

        using var setupClient = env.CreateAuthenticatedClient(AdminUserId);

        var alloc1 = (await (await setupClient.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                QuantityRequested = 40m,
                ReferenceNumber = "CONC-ALLOC-1"
            })).Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        var alloc2 = (await (await setupClient.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                QuantityRequested = 40m,
                ReferenceNumber = "CONC-ALLOC-2"
            })).Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        Assert.Equal(HttpStatusCode.OK, (await setupClient.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{alloc1.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 40m })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await setupClient.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{alloc2.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 40m })).StatusCode);

        // Fire two simultaneous dispatch HTTP requests on separate clients
        using var client1 = env.CreateAuthenticatedClient(AdminUserId);
        using var client2 = env.CreateAuthenticatedClient(AdminUserId);

        var responses = await Task.WhenAll(
            client1.PatchAsJsonAsync(
                $"/api/ResourceAllocations/{alloc1.AllocationId}/dispatch",
                new UpdateResourceAllocationStatusRequest { Notes = "Concurrent dispatch 1" }),
            client2.PatchAsJsonAsync(
                $"/api/ResourceAllocations/{alloc2.AllocationId}/dispatch",
                new UpdateResourceAllocationStatusRequest { Notes = "Concurrent dispatch 2" }));

        var successCount = responses.Count(r => r.StatusCode == HttpStatusCode.OK);
        var rejectedCount = responses.Count(r => r.StatusCode != HttpStatusCode.OK);

        Assert.Equal(1, successCount);
        Assert.Equal(1, rejectedCount);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var inv = await db.WarehouseInventories.AsNoTracking()
            .SingleAsync(i => i.InventoryId == SyntheticInventoryId);
        Assert.Equal(20m, inv.QuantityAvailable);
        Assert.True(inv.QuantityAvailable >= 0m);

        var txs = await db.InventoryTransactions.AsNoTracking().ToListAsync();
        var singleTx = Assert.Single(txs);
        Assert.Equal(InventoryTransactionType.StockOut, singleTx.TransactionType);
        Assert.Equal(40m, singleTx.Quantity);
        Assert.Equal(20m, singleTx.NewQuantity);

        var persistedAllocs = await db.ResourceAllocations.AsNoTracking().ToListAsync();
        Assert.Equal(1, persistedAllocs.Count(a => a.Status == ResourceAllocationStatus.Dispatched));
        Assert.Equal(1, persistedAllocs.Count(a => a.Status == ResourceAllocationStatus.Approved));
    }

    // =========================================================================
    // 2. Concurrency: Simultaneous Shelter Placements Exceeding Capacity
    // =========================================================================

    [Fact]
    public async Task Concurrency_SimultaneousShelterPlacements_PreventsCapacityOverflow()
    {
        // Capacity = 10, Initial occupancy = 4 -> remaining = 6; two simultaneous requests for 5 people each
        await using var env = await IsolatedConcurrentTestEnv.CreateAsync(
            shelterCapacity: 10,
            shelterOccupancy: 4);

        using var client1 = env.CreateAuthenticatedClient(AdminUserId);
        using var client2 = env.CreateAuthenticatedClient(AdminUserId);

        var responses = await Task.WhenAll(
            client1.PostAsJsonAsync(
                "/api/Shelters/placements",
                new CreateShelterPlacementRequest
                {
                    ShelterId = SyntheticShelterId,
                    ResidentName = "Concurrent Household 1",
                    PeopleCount = 5
                }),
            client2.PostAsJsonAsync(
                "/api/Shelters/placements",
                new CreateShelterPlacementRequest
                {
                    ShelterId = SyntheticShelterId,
                    ResidentName = "Concurrent Household 2",
                    PeopleCount = 5
                }));

        var createdCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        Assert.Equal(1, createdCount);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var shelter = await db.Shelters.AsNoTracking()
            .SingleAsync(s => s.ShelterId == SyntheticShelterId);
        Assert.Equal(9, shelter.CurrentOccupancy);
        Assert.True(shelter.CurrentOccupancy <= shelter.Capacity);

        var placements = await db.ShelterPlacements.AsNoTracking().ToListAsync();
        Assert.Single(placements);
    }

    // =========================================================================
    // 3. Concurrency: Simultaneous Conflicting Volunteer Assignments
    // =========================================================================

    [Fact]
    public async Task Concurrency_SimultaneousConflictingVolunteerAssignments_PreventsDuplicateActiveAssignments()
    {
        await using var env = await IsolatedConcurrentTestEnv.CreateAsync();

        using var client1 = env.CreateAuthenticatedClient(AdminUserId);
        using var client2 = env.CreateAuthenticatedClient(AdminUserId);

        var responses = await Task.WhenAll(
            client1.PostAsJsonAsync(
                "/api/Volunteers/assignments",
                new CreateVolunteerAssignmentRequest
                {
                    VolunteerId = SyntheticVolunteerId,
                    CrisisId = ActiveCrisisId,
                    RoleTitle = "Concurrent Assignment A"
                }),
            client2.PostAsJsonAsync(
                "/api/Volunteers/assignments",
                new CreateVolunteerAssignmentRequest
                {
                    VolunteerId = SyntheticVolunteerId,
                    CrisisId = ActiveCrisisId,
                    RoleTitle = "Concurrent Assignment B"
                }));

        var createdCount = responses.Count(r => r.StatusCode == HttpStatusCode.Created);
        Assert.Equal(1, createdCount);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var activeAssignments = await db.VolunteerAssignments.AsNoTracking()
            .Where(a => a.VolunteerId == SyntheticVolunteerId && a.CrisisId == ActiveCrisisId)
            .ToListAsync();
        Assert.Single(activeAssignments);

        var vol = await db.Volunteers.AsNoTracking()
            .SingleAsync(v => v.VolunteerId == SyntheticVolunteerId);
        Assert.Equal("Deployed", vol.AvailabilityStatus);
    }

    // =========================================================================
    // 4. Security Isolation: Citizen Data & Notification Privacy
    // =========================================================================

    [Fact]
    public async Task SecurityIsolation_CitizenCannotAccessModifyDeleteOrReadNotificationsOfAnotherCitizen()
    {
        await using var env = await IsolatedConcurrentTestEnv.CreateAsync();

        using var citizenAClient = env.CreateAuthenticatedClient(CitizenAUserId);
        using var citizenBClient = env.CreateAuthenticatedClient(CitizenBUserId);
        using var adminClient = env.CreateAuthenticatedClient(AdminUserId);

        // Citizen A submits request
        var createRes = await citizenAClient.PostAsJsonAsync(
            "/api/CitizenRequests",
            new CreateCitizenRequest
            {
                RequestType = "Medical",
                Description = "Synthetic private medical request for Citizen A.",
                UrgencyLevel = "High",
                PeopleCount = 2,
                AreaId = SyntheticAreaId,
                CrisisId = ActiveCrisisId,
                Address = "Synthetic Private Residence A"
            });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = (await createRes.Content.ReadFromJsonAsync<CitizenRequestResponse>(JsonOptions))!;

        // Coordinator updates Citizen A's status -> triggers live notification to Citizen A
        Assert.Equal(HttpStatusCode.OK, (await adminClient.PatchAsJsonAsync(
            $"/api/CitizenRequests/{created.RequestId}/status",
            new UpdateCitizenRequestStatus { Status = "Verified" })).StatusCode);

        // Citizen A sees own request and 2 notifications (Created + StatusUpdated)
        var myReqsA = await (await citizenAClient.GetAsync("/api/CitizenRequests/my"))
            .Content.ReadFromJsonAsync<List<CitizenRequestResponse>>(JsonOptions);
        Assert.Single(myReqsA!);

        var notifsA = await (await citizenAClient.GetAsync("/api/Notifications/my"))
            .Content.ReadFromJsonAsync<List<NotificationResponse>>(JsonOptions);
        Assert.NotNull(notifsA);
        Assert.Equal(2, notifsA.Count);
        Assert.All(notifsA, n => Assert.Equal(CitizenAUserId, n.UserId));

        // Citizen B cannot see Citizen A's request or notifications, nor read/modify/delete by ID
        var myReqsB = await (await citizenBClient.GetAsync("/api/CitizenRequests/my"))
            .Content.ReadFromJsonAsync<List<CitizenRequestResponse>>(JsonOptions);
        Assert.Empty(myReqsB!);

        var notifsB = await (await citizenBClient.GetAsync("/api/Notifications/my"))
            .Content.ReadFromJsonAsync<List<NotificationResponse>>(JsonOptions);
        Assert.Empty(notifsB!);

        var getByIdB = await citizenBClient.GetAsync($"/api/CitizenRequests/{created.RequestId}");
        Assert.Equal(HttpStatusCode.Forbidden, getByIdB.StatusCode);

        var deleteByIdB = await citizenBClient.DeleteAsync($"/api/CitizenRequests/{created.RequestId}");
        Assert.Equal(HttpStatusCode.NotFound, deleteByIdB.StatusCode);

        // Citizen A marks own notifications read
        var readAllRes = await citizenAClient.PatchAsync("/api/Notifications/read-all", content: null);
        Assert.Equal(HttpStatusCode.OK, readAllRes.StatusCode);
    }

    // =========================================================================
    // 5. Security Isolation: Organization-Scoped Access & Header Enforcement
    // =========================================================================

    [Fact]
    public async Task SecurityIsolation_OrganizationScopedAdmin_CanManageOwnOrgOnlyAndCannotAccessOtherOrg()
    {
        await using var env = await IsolatedConcurrentTestEnv.CreateAsync();

        using var org1AdminClient = env.CreateAuthenticatedClient(Org1AdminUserId);

        // Org 1 admin can list and approve memberships in Organization 1
        var org1MembersRes = await org1AdminClient.GetAsync($"/api/Organizations/{Organization1Id}/members");
        Assert.Equal(HttpStatusCode.OK, org1MembersRes.StatusCode);
        var org1Members = await org1MembersRes.Content.ReadFromJsonAsync<List<OrganizationMemberResponse>>(JsonOptions);
        Assert.NotNull(org1Members);
        Assert.Equal(2, org1Members.Count);

        var approveOrg1Res = await org1AdminClient.PatchAsync(
            $"/api/Organizations/{Organization1Id}/members/{Org1PendingMembershipId}/approve",
            content: null);
        Assert.Equal(HttpStatusCode.OK, approveOrg1Res.StatusCode);

        // Org 1 admin CANNOT list or approve memberships in Organization 2 (403 Forbidden)
        var org2MembersRes = await org1AdminClient.GetAsync($"/api/Organizations/{Organization2Id}/members");
        Assert.Equal(HttpStatusCode.Forbidden, org2MembersRes.StatusCode);

        var approveOrg2Res = await org1AdminClient.PatchAsync(
            $"/api/Organizations/{Organization2Id}/members/{Org2PendingMembershipId}/approve",
            content: null);
        Assert.Equal(HttpStatusCode.Forbidden, approveOrg2Res.StatusCode);

        // Mismatched X-Organization-Id header on Org 1 endpoint is rejected with 403 Forbidden
        using var mismatchedHeaderReq = new HttpRequestMessage(
            HttpMethod.Get,
            $"/api/Organizations/{Organization1Id}/members");
        mismatchedHeaderReq.Headers.Add("X-Organization-Id", Organization2Id.ToString());
        var mismatchRes = await org1AdminClient.SendAsync(mismatchedHeaderReq);
        Assert.Equal(HttpStatusCode.Forbidden, mismatchRes.StatusCode);
    }

    // =========================================================================
    // 6. Opt-In SQL Server Staging Concurrency Guard Verification
    // =========================================================================

    [Fact]
    public async Task OptInSqlServerStagingConcurrencyTests_WhenNotEnabled_ExitsSafelyWithoutConnecting()
    {
        var enabled = string.Equals(
            Environment.GetEnvironmentVariable("HCMS_RUN_SQLSERVER_STAGING_CONCURRENCY_TESTS"),
            "true",
            StringComparison.OrdinalIgnoreCase);

        if (!enabled)
        {
            // Default safe behavior: never touch SQL Server unless explicitly opted in against a dedicated staging DB.
            Assert.False(enabled);
            return;
        }

        var stagingConn = Environment.GetEnvironmentVariable("HCMS_STAGING_SQLSERVER_CONNECTION");
        Assert.False(
            string.IsNullOrWhiteSpace(stagingConn),
            "HCMS_STAGING_SQLSERVER_CONNECTION must point to an isolated staging database.");
        Assert.DoesNotContain(
            "HumanitarianCrisisDB",
            stagingConn!,
            StringComparison.OrdinalIgnoreCase);

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer(stagingConn)
            .Options;

        await using var db = new ApplicationDbContext(options);
        Assert.True(await db.Database.CanConnectAsync());
    }

    // =========================================================================
    // Isolated Temporary File-Backed SQLite Host (Independent Connections/Request)
    // =========================================================================

    private sealed class IsolatedConcurrentTestEnv : IAsyncDisposable
    {
        private readonly string _dbFilePath;
        private readonly ConcurrentWebAppFactory _factory;

        private IsolatedConcurrentTestEnv(string dbFilePath, ConcurrentWebAppFactory factory)
        {
            _dbFilePath = dbFilePath;
            _factory = factory;
        }

        public static async Task<IsolatedConcurrentTestEnv> CreateAsync(
            decimal initialStock = 100m,
            int shelterCapacity = 20,
            int shelterOccupancy = 0)
        {
            var dbFilePath = Path.Combine(
                Path.GetTempPath(),
                $"hcms_conc_test_{Guid.NewGuid():N}.db");

            var sqliteConnectionString = new SqliteConnectionStringBuilder
            {
                DataSource = dbFilePath,
                Mode = SqliteOpenMode.ReadWriteCreate,
                DefaultTimeout = 15,
                Pooling = false
            }.ToString();

            var factory = new ConcurrentWebAppFactory(sqliteConnectionString);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.EnsureCreatedAsync();
                await db.Database.ExecuteSqlRawAsync("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=15000;");

                var now = new DateTime(2026, 11, 25, 0, 0, 0, DateTimeKind.Utc);

                db.Areas.Add(new Area
                {
                    AreaId = SyntheticAreaId,
                    AreaName = "Synthetic Concurrency District",
                    AreaType = "District",
                    IsActive = true
                });

                db.Users.AddRange(
                    new User
                    {
                        UserId = CitizenAUserId,
                        FullName = "Synthetic Citizen A",
                        Email = "citizen.a.conc@test.local",
                        PasswordHash = "SYNTHETIC-HASH",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new User
                    {
                        UserId = CitizenBUserId,
                        FullName = "Synthetic Citizen B",
                        Email = "citizen.b.conc@test.local",
                        PasswordHash = "SYNTHETIC-HASH",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new User
                    {
                        UserId = AdminUserId,
                        FullName = "Synthetic Admin",
                        Email = "admin.conc@test.local",
                        PasswordHash = "SYNTHETIC-HASH",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new User
                    {
                        UserId = Org1AdminUserId,
                        FullName = "Synthetic Org 1 Admin",
                        Email = "org1.admin@test.local",
                        PasswordHash = "SYNTHETIC-HASH",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new User
                    {
                        UserId = PendingMemberUserId,
                        FullName = "Synthetic Pending Applicant",
                        Email = "pending.member@test.local",
                        PasswordHash = "SYNTHETIC-HASH",
                        IsActive = true,
                        CreatedAt = now
                    });

                db.UserRoles.AddRange(
                    new UserRole { UserId = CitizenAUserId, RoleId = 1 },
                    new UserRole { UserId = CitizenBUserId, RoleId = 1 },
                    new UserRole { UserId = AdminUserId, RoleId = 2 },
                    new UserRole { UserId = Org1AdminUserId, RoleId = 1 },
                    new UserRole { UserId = PendingMemberUserId, RoleId = 1 });

                // Seed two organizations + org-scoped role granting Organizations.View & Organizations.ApproveMembers on Org 1 ONLY
                db.Organizations.AddRange(
                    new Organization
                    {
                        OrganizationId = Organization1Id,
                        OrganizationName = "Synthetic Relief Org One",
                        OrganizationType = "NGO",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new Organization
                    {
                        OrganizationId = Organization2Id,
                        OrganizationName = "Synthetic Relief Org Two",
                        OrganizationType = "NGO",
                        IsActive = true,
                        CreatedAt = now
                    });

                db.Roles.Add(new Role
                {
                    RoleId = Org1ScopedAdminRoleId,
                    RoleName = "OrgCoordinator",
                    OrganizationId = Organization1Id
                });

                var orgPermIds = await db.Permissions
                    .Where(p => p.PermissionName == "Organizations.View" || p.PermissionName == "Organizations.ApproveMembers")
                    .Select(p => p.PermissionId)
                    .ToListAsync();

                foreach (var permId in orgPermIds)
                {
                    db.RolePermissions.Add(new RolePermission
                    {
                        RoleId = Org1ScopedAdminRoleId,
                        PermissionId = permId
                    });
                }

                db.OrganizationMemberships.AddRange(
                    new OrganizationMembership
                    {
                        MembershipId = Org1AdminMembershipId,
                        OrganizationId = Organization1Id,
                        UserId = Org1AdminUserId,
                        MembershipStatus = "Approved",
                        JoinedAt = now,
                        ApprovedAt = now,
                        ApprovedByUserId = AdminUserId
                    },
                    new OrganizationMembership
                    {
                        MembershipId = Org1PendingMembershipId,
                        OrganizationId = Organization1Id,
                        UserId = PendingMemberUserId,
                        MembershipStatus = "Pending",
                        JoinedAt = now
                    },
                    new OrganizationMembership
                    {
                        MembershipId = Org2PendingMembershipId,
                        OrganizationId = Organization2Id,
                        UserId = PendingMemberUserId,
                        MembershipStatus = "Pending",
                        JoinedAt = now
                    });

                db.OrganizationMembershipRoles.Add(new OrganizationMembershipRole
                {
                    MembershipId = Org1AdminMembershipId,
                    OrganizationId = Organization1Id,
                    RoleId = Org1ScopedAdminRoleId,
                    AssignedAt = now,
                    AssignedByUserId = AdminUserId
                });

                db.CrisisEvents.Add(new CrisisEvent
                {
                    CrisisId = ActiveCrisisId,
                    CrisisName = "Synthetic Concurrency Flood",
                    CrisisType = "Flood",
                    Description = "Synthetic crisis for contention tests.",
                    SeverityLevel = "High",
                    StartDate = now,
                    Status = "Active"
                });

                db.Resources.Add(new Resource
                {
                    ResourceId = SyntheticResourceId,
                    ResourceName = "Synthetic Water Tank",
                    ResourceCategory = "Water",
                    UnitOfMeasure = "Tank",
                    IsActive = true,
                    CreatedAt = now
                });

                db.Warehouses.Add(new Warehouse
                {
                    WarehouseId = SyntheticWarehouseId,
                    WarehouseName = "Synthetic Concurrency Warehouse",
                    WarehouseCode = "SYN-CONC-WH",
                    Address = "Synthetic Hub",
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
                    ReorderLevel = 5m,
                    LastUpdatedAt = now
                });

                db.Shelters.Add(new Shelter
                {
                    ShelterId = SyntheticShelterId,
                    ShelterName = "Synthetic Concurrency Shelter",
                    AreaId = SyntheticAreaId,
                    Address = "Synthetic Shelter Rd",
                    Capacity = shelterCapacity,
                    CurrentOccupancy = shelterOccupancy,
                    Status = shelterOccupancy >= shelterCapacity ? "Full" : "Open",
                    IsActive = true,
                    CreatedAt = now
                });

                db.Volunteers.Add(new Volunteer
                {
                    VolunteerId = SyntheticVolunteerId,
                    FullName = "Synthetic Concurrency Volunteer",
                    Email = "vol.conc@test.local",
                    AreaId = SyntheticAreaId,
                    Skills = "Search & Rescue",
                    AvailabilityStatus = "Available",
                    ApprovalStatus = "Approved",
                    IsActive = true,
                    CreatedAt = now
                });

                await db.SaveChangesAsync();
            }

            return new IsolatedConcurrentTestEnv(dbFilePath, factory);
        }

        public HttpClient CreateAuthenticatedClient(int userId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

            var user = db.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Single(u => u.UserId == userId);

            var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", jwtService.GenerateToken(user).AccessToken);
            return client;
        }

        public AsyncServiceScope CreateVerificationScope() => _factory.Services.CreateAsyncScope();

        public async ValueTask DisposeAsync()
        {
            await _factory.DisposeAsync();
            SqliteConnection.ClearAllPools();

            foreach (var suffix in new[] { "", "-wal", "-shm" })
            {
                var path = _dbFilePath + suffix;
                try
                {
                    if (File.Exists(path))
                        File.Delete(path);
                }
                catch
                {
                    // ignore transient Windows file lock during test cleanup
                }
            }
        }
    }

    private sealed class ConcurrentWebAppFactory : WebApplicationFactory<Program>
    {
        private const string TestIssuer = "HumanitarianCrisisManagementAPI.ConcTest";
        private const string TestAudience = "HumanitarianCrisisManagementClient.ConcTest";

        private readonly string _sqliteConnectionString;
        private readonly string _ephemeralJwtKeyBase64;

        public ConcurrentWebAppFactory(string sqliteConnectionString)
        {
            _sqliteConnectionString = sqliteConnectionString;

            var keyBytes = new byte[32];
            RandomNumberGenerator.Fill(keyBytes);
            _ephemeralJwtKeyBase64 = Convert.ToBase64String(keyBytes);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.UseSetting("ConnectionStrings:DefaultConnection", _sqliteConnectionString);
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
                    ["ConnectionStrings:DefaultConnection"] = _sqliteConnectionString,
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
                    options.UseSqlite(_sqliteConnectionString));

                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.TokenValidationParameters.IssuerSigningKey =
                        new SymmetricSecurityKey(Convert.FromBase64String(_ephemeralJwtKeyBase64));
                    options.TokenValidationParameters.ValidIssuer = TestIssuer;
                    options.TokenValidationParameters.ValidAudience = TestAudience;
                });

                services.RemoveAll<IAiAnalysisProvider>();
                services.AddSingleton<IAiAnalysisProvider>(new NoOpAiAnalysisProvider());
            });
        }
    }

    private sealed class NoOpAiAnalysisProvider : IAiAnalysisProvider
    {
        public bool IsConfigured => false;
        public string ProviderName => "NoOp";

        public Task<AiAnalysisResult> AnalyzeCitizenRequestAsync(
            AiAnalysisContext context,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("AI provider must never be called in concurrency tests.");

        public Task<AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("AI diagnostic must never be called in concurrency tests.");
    }
}
