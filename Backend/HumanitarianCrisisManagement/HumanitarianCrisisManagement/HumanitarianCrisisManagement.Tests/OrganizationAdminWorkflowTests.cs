using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;
using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.DTOs.Users;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
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
/// End-to-end multi-tenant RBAC and OrganizationAdmin workflow integration tests:
/// - Registering admin@test.com as a normal user (without global Administrator privileges)
/// - System Administrator creating TEST organization
/// - Adding & approving membership for admin@test.com
/// - Creating OrganizationAdmin role scoped to TEST (IsSystemDefined = false)
/// - Assigning OrganizationAdmin to the approved membership
/// - Verifying OrganizationAdmin can manage TEST, receives 403 on other organizations,
///   receives 403 on global System Administrator endpoints & global role modifications,
///   enforces X-Organization-Id header, and blocks unapproved members.
/// </summary>
public class OrganizationAdminWorkflowTests
{
    private const int SystemAdminUserId = 2;
    private const string OrgAdminEmail = "admin@test.com";
    private const string SyntheticPassword = "SyntheticOrgAdmin!2026";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public async Task CompleteTestOrganizationAdminWorkflow_EnforcesMultiTenantBoundariesAndExcludesGlobalAdminAccess()
    {
        await using var env = await OrgWorkflowTestEnvironment.CreateAsync();
        using var sysAdminClient = env.CreateAuthenticatedClient(SystemAdminUserId);
        using var anonClient = env.CreateAnonymousClient();

        // 1. Register admin@test.com normally (starts as Citizen, NO global Administrator role)
        var regRes = await anonClient.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                FullName = "TEST Organization Admin",
                Email = OrgAdminEmail,
                Password = SyntheticPassword,
                PhoneNumber = "0770001122"
            });
        Assert.Equal(HttpStatusCode.Created, regRes.StatusCode);
        var orgAdminAuth = (await regRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions))!;
        using var orgAdminClient = env.CreateClientWithToken(orgAdminAuth.AccessToken);

        // Verify admin@test.com does NOT have global Administrator role
        var meRes = await orgAdminClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);
        var me = (await meRes.Content.ReadFromJsonAsync<CurrentUserResponse>(JsonOptions))!;
        Assert.DoesNotContain("Administrator", me.Roles);
        Assert.DoesNotContain("Organizations.Manage", me.Permissions);

        // 2. System Admin creates "TEST" organization + another separate organization "OTHER_ORG"
        var createTestOrgRes = await sysAdminClient.PostAsJsonAsync(
            "/api/organizations",
            new CreateOrganizationRequest
            {
                OrganizationName = "TEST",
                OrganizationType = "NGO",
                RegistrationNumber = "REG-TEST-001",
                Email = "contact@test.com"
            });
        Assert.Equal(HttpStatusCode.Created, createTestOrgRes.StatusCode);
        var testOrg = (await createTestOrgRes.Content.ReadFromJsonAsync<OrganizationResponse>(JsonOptions))!;
        Assert.Equal("TEST", testOrg.OrganizationName);

        var createOtherOrgRes = await sysAdminClient.PostAsJsonAsync(
            "/api/organizations",
            new CreateOrganizationRequest
            {
                OrganizationName = "OTHER_ORG",
                OrganizationType = "NGO",
                RegistrationNumber = "REG-OTHER-002"
            });
        Assert.Equal(HttpStatusCode.Created, createOtherOrgRes.StatusCode);
        var otherOrg = (await createOtherOrgRes.Content.ReadFromJsonAsync<OrganizationResponse>(JsonOptions))!;

        // 3. System Admin adds admin@test.com to TEST (status = Pending)
        var addMemberRes = await sysAdminClient.PostAsJsonAsync(
            $"/api/organizations/{testOrg.OrganizationId}/members",
            new AddOrganizationMemberRequest { Email = OrgAdminEmail });
        Assert.Equal(HttpStatusCode.Created, addMemberRes.StatusCode);
        var membership = (await addMemberRes.Content.ReadFromJsonAsync<OrganizationMembershipResponse>(JsonOptions))!;
        Assert.Equal("Pending", membership.MembershipStatus);

        // Unapproved member MUST NOT receive organization access (403 Forbidden)
        var unapprovedAccessRes = await orgAdminClient.GetAsync($"/api/organizations/{testOrg.OrganizationId}/my-access");
        Assert.Equal(HttpStatusCode.Forbidden, unapprovedAccessRes.StatusCode);

        // 4. System Admin approves membership
        var approveRes = await sysAdminClient.PatchAsync(
            $"/api/organizations/{testOrg.OrganizationId}/members/{membership.MembershipId}/approve",
            content: null);
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);

        // 5. System Admin creates OrganizationAdmin role scoped to TEST (IsSystemDefined = false)
        var createRoleRes = await sysAdminClient.PostAsJsonAsync(
            $"/api/organizations/{testOrg.OrganizationId}/roles",
            new CreateOrganizationRoleRequest
            {
                RoleName = "OrganizationAdmin",
                Description = "Scoped administrator for TEST organization"
            });
        Assert.Equal(HttpStatusCode.Created, createRoleRes.StatusCode);
        var orgAdminRole = (await createRoleRes.Content.ReadFromJsonAsync<OrganizationRoleResponse>(JsonOptions))!;
        Assert.Equal("OrganizationAdmin", orgAdminRole.RoleName);
        Assert.Equal(testOrg.OrganizationId, orgAdminRole.OrganizationId);
        Assert.False(orgAdminRole.IsSystemDefined);

        var assignedPermissionNames = orgAdminRole.Permissions.Select(p => p.PermissionName).ToList();
        Assert.Contains("Organizations.View", assignedPermissionNames);
        Assert.Contains("Organizations.Manage", assignedPermissionNames);
        Assert.Contains("Organizations.ApproveMembers", assignedPermissionNames);
        Assert.Contains("Resources.View", assignedPermissionNames);
        Assert.Contains("Resources.Manage", assignedPermissionNames);
        Assert.Contains("Resources.Allocate", assignedPermissionNames);
        Assert.Contains("Reports.View", assignedPermissionNames);
        Assert.DoesNotContain("Users.Manage", assignedPermissionNames);
        Assert.DoesNotContain("Roles.Manage", assignedPermissionNames);
        Assert.DoesNotContain("AuditLogs.View", assignedPermissionNames);

        // 6. System Admin assigns OrganizationAdmin role to approved membership
        var assignRoleRes = await sysAdminClient.PutAsJsonAsync(
            $"/api/organizations/{testOrg.OrganizationId}/members/{membership.MembershipId}/roles",
            new AssignOrganizationRolesRequest { RoleIds = [orgAdminRole.RoleId] });
        Assert.Equal(HttpStatusCode.OK, assignRoleRes.StatusCode);

        // 6b. Verify GET /api/roles reports UserCount = 1 for OrganizationAdmin (via OrganizationMembershipRoles)
        var allRolesRes = await sysAdminClient.GetAsync("/api/roles");
        Assert.Equal(HttpStatusCode.OK, allRolesRes.StatusCode);
        var allRoles = await allRolesRes.Content.ReadFromJsonAsync<List<RoleDetailResponse>>(JsonOptions);
        var orgAdminDetail = Assert.Single(allRoles!, r => r.RoleId == orgAdminRole.RoleId);
        Assert.Equal(1, orgAdminDetail.UserCount);

        // 6c. Verify GET /api/users reports Department/Organizations and OrganizationRoles for admin@test.com
        var allUsersRes = await sysAdminClient.GetAsync("/api/users");
        Assert.Equal(HttpStatusCode.OK, allUsersRes.StatusCode);
        var allUsers = await allUsersRes.Content.ReadFromJsonAsync<List<UserAdminResponse>>(JsonOptions);
        var orgAdminUser = Assert.Single(allUsers!, u => u.Email == OrgAdminEmail);
        Assert.Equal("TEST", orgAdminUser.Department);
        Assert.Contains("TEST", orgAdminUser.Organizations);
        Assert.Contains("OrganizationAdmin (TEST)", orgAdminUser.OrganizationRoles);

        // 7. Verify effective organization access for admin@test.com
        var myAccessRes = await orgAdminClient.GetAsync($"/api/organizations/{testOrg.OrganizationId}/my-access");
        Assert.Equal(HttpStatusCode.OK, myAccessRes.StatusCode);
        var myAccess = (await myAccessRes.Content.ReadFromJsonAsync<MyOrganizationAccessResponse>(JsonOptions))!;
        Assert.Equal(testOrg.OrganizationId, myAccess.OrganizationId);
        Assert.Equal("Approved", myAccess.MembershipStatus);
        Assert.Contains("OrganizationAdmin", myAccess.Roles);
        Assert.Contains("Organizations.Manage", myAccess.Permissions);

        // 8. OrganizationAdmin CAN view and update TEST organization profile & roles & members
        var getTestOrgRes = await orgAdminClient.GetAsync($"/api/organizations/{testOrg.OrganizationId}");
        Assert.Equal(HttpStatusCode.OK, getTestOrgRes.StatusCode);

        var updateTestOrgRes = await orgAdminClient.PutAsJsonAsync(
            $"/api/organizations/{testOrg.OrganizationId}",
            new UpdateOrganizationRequest
            {
                OrganizationName = "TEST",
                OrganizationType = "NGO",
                RegistrationNumber = "REG-TEST-001",
                Description = "Updated by OrganizationAdmin",
                IsActive = true
            });
        Assert.Equal(HttpStatusCode.OK, updateTestOrgRes.StatusCode);

        var getRolesRes = await orgAdminClient.GetAsync($"/api/organizations/{testOrg.OrganizationId}/roles");
        Assert.Equal(HttpStatusCode.OK, getRolesRes.StatusCode);

        // 9. OrganizationAdmin CANNOT manage or view OTHER_ORG (403 Forbidden)
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.GetAsync($"/api/organizations/{otherOrg.OrganizationId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.GetAsync($"/api/organizations/{otherOrg.OrganizationId}/members")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.PutAsJsonAsync(
            $"/api/organizations/{otherOrg.OrganizationId}",
            new UpdateOrganizationRequest { OrganizationName = "OTHER_ORG", OrganizationType = "NGO", IsActive = true })).StatusCode);

        // 10. Mismatched X-Organization-Id header on TEST endpoint -> 403 Forbidden
        using var mismatchedReq = new HttpRequestMessage(HttpMethod.Get, $"/api/organizations/{testOrg.OrganizationId}/members");
        mismatchedReq.Headers.Add("X-Organization-Id", otherOrg.OrganizationId.ToString());
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.SendAsync(mismatchedReq)).StatusCode);

        // 11. OrganizationAdmin CANNOT access System Administrator endpoints or modify global system roles (403 Forbidden)
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.GetAsync("/api/roles")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.GetAsync("/api/auditlogs")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.PutAsJsonAsync(
            "/api/roles/1/permissions",
            new { permissionIds = new[] { 1, 2 } })).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await orgAdminClient.PostAsJsonAsync(
            "/api/organizations",
            new CreateOrganizationRequest { OrganizationName = "ROGUE", OrganizationType = "NGO" })).StatusCode);
    }

    [Fact]
    public async Task CreateOrganizationRole_RejectsGlobalSystemPermissionsEscalation()
    {
        await using var env = await OrgWorkflowTestEnvironment.CreateAsync();
        using var sysAdminClient = env.CreateAuthenticatedClient(SystemAdminUserId);

        var orgRes = await sysAdminClient.PostAsJsonAsync(
            "/api/organizations",
            new CreateOrganizationRequest
            {
                OrganizationName = "TEST",
                OrganizationType = "NGO"
            });
        Assert.Equal(HttpStatusCode.Created, orgRes.StatusCode);
        var org = (await orgRes.Content.ReadFromJsonAsync<OrganizationResponse>(JsonOptions))!;

        // PermissionId 2 = Users.Manage (global-only system permission) -> must be rejected with 400
        var escalateRes = await sysAdminClient.PostAsJsonAsync(
            $"/api/organizations/{org.OrganizationId}/roles",
            new CreateOrganizationRoleRequest
            {
                RoleName = "EscalatedRole",
                PermissionIds = [2]
            });
        Assert.Equal(HttpStatusCode.BadRequest, escalateRes.StatusCode);
    }

    // =========================================================================
    // Isolated SQLite In-Memory Test Host
    // =========================================================================

    private sealed class OrgWorkflowTestEnvironment : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly OrgWebAppFactory _factory;

        private OrgWorkflowTestEnvironment(SqliteConnection connection, OrgWebAppFactory factory)
        {
            _connection = connection;
            _factory = factory;
        }

        public static async Task<OrgWorkflowTestEnvironment> CreateAsync()
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var factory = new OrgWebAppFactory(connection);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.EnsureCreatedAsync();

                db.Users.Add(new User
                {
                    UserId = SystemAdminUserId,
                    FullName = "Synthetic System Admin",
                    Email = "admin.test+20261116@example.com",
                    PasswordHash = "SYNTHETIC-HASH",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
                db.UserRoles.Add(new UserRole { UserId = SystemAdminUserId, RoleId = 2 });
                await db.SaveChangesAsync();
            }

            return new OrgWorkflowTestEnvironment(connection, factory);
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
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

            var user = db.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Single(u => u.UserId == userId);

            return CreateClientWithToken(jwtService.GenerateToken(user).AccessToken);
        }

        public async ValueTask DisposeAsync()
        {
            await _factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    private sealed class OrgWebAppFactory : WebApplicationFactory<Program>
    {
        private const string TestIssuer = "HumanitarianCrisisManagementAPI.OrgAdminTest";
        private const string TestAudience = "HumanitarianCrisisManagementClient.OrgAdminTest";

        private readonly SqliteConnection _connection;
        private readonly string _ephemeralJwtKeyBase64;

        public OrgWebAppFactory(SqliteConnection connection)
        {
            _connection = connection;
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

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                    ["Jwt:Key"] = _ephemeralJwtKeyBase64,
                    ["Jwt:Issuer"] = TestIssuer,
                    ["Jwt:Audience"] = TestAudience,
                    ["Jwt:AccessTokenExpirationMinutes"] = "30",
                    ["AiProvider:Provider"] = "None"
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
                services.AddSingleton<IAiAnalysisProvider>(new NoOpAiProvider());
            });
        }
    }

    private sealed class NoOpAiProvider : IAiAnalysisProvider
    {
        public bool IsConfigured => false;
        public string ProviderName => "NoOp";

        public Task<Application.Interfaces.AiAnalysisResult> AnalyzeCitizenRequestAsync(
            Application.Interfaces.AiAnalysisContext context,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("AI provider is not used in organization tests.");

        public Task<Application.DTOs.AiRecommendations.AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("AI diagnostic is not used in organization tests.");
    }
}
