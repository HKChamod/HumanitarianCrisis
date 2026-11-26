using System.Net;
using System.Net.Http.Json;
using System.Text;
using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

public class OrganizationWorkspaceTests
{
    private static readonly string TestJwtKey = Convert.ToBase64String(
        Encoding.UTF8.GetBytes("TEST_ONLY_SYNTHETIC_JWT_KEY_32_BYTES_LONG!!"));
    private const string TestJwtIssuer = "HumanitarianCrisisManagementAPI";
    private const string TestJwtAudience = "HumanitarianCrisisManagementClient";

    private sealed class OrgWorkspaceEnv : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        public WebApplicationFactory<Program> Factory { get; }
        public int OrgAId { get; private set; }
        public int OrgBId { get; private set; }
        public int OrgAdminUserId { get; private set; }
        public int OrgAdminMembershipId { get; private set; }
        public int OrdinaryMemberUserId { get; private set; }
        public int PendingMemberUserId { get; private set; }
        public int OrgBMemberUserId { get; private set; }
        public int AreaId { get; private set; }
        public int CrisisId { get; private set; }
        public int CitizenRequestId { get; private set; }

        private OrgWorkspaceEnv(SqliteConnection connection, WebApplicationFactory<Program> factory)
        {
            _connection = connection;
            Factory = factory;
        }

        public static async Task<OrgWorkspaceEnv> CreateAsync()
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
            {
                builder.UseEnvironment("Testing");
                builder.UseSetting("ConnectionStrings:DefaultConnection", "DataSource=:memory:");
                builder.UseSetting("Jwt:Key", TestJwtKey);
                builder.UseSetting("Jwt:Issuer", TestJwtIssuer);
                builder.UseSetting("Jwt:Audience", TestJwtAudience);
                builder.UseSetting("Jwt:AccessTokenExpirationMinutes", "60");
                builder.UseSetting("AiProvider:Provider", "None");
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                    services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                    services.AddDbContext<ApplicationDbContext>(opts => opts.UseSqlite(connection));
                });
            });

            var env = new OrgWorkspaceEnv(connection, factory);

            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();

            var hasher = new PasswordHasherService();

            var orgA = new Organization { OrganizationName = "Org Alpha", OrganizationType = "NGO", IsActive = true };
            var orgB = new Organization { OrganizationName = "Org Beta", OrganizationType = "Hospital", IsActive = true };
            db.Organizations.AddRange(orgA, orgB);

            var area = new Area { AreaName = "Colombo", AreaType = "District", Latitude = 6.9271m, Longitude = 79.8612m, IsActive = true };
            db.Areas.Add(area);

            var userAdmin = new User { FullName = "OrgA Admin", Email = "orga.admin@test.local", IsActive = true };
            userAdmin.PasswordHash = hasher.HashPassword(userAdmin, "TestPass!1");
            userAdmin.UserRoles.Add(new UserRole { User = userAdmin, RoleId = 1 }); // Citizen global

            var userMember = new User { FullName = "OrgA Member", Email = "orga.member@test.local", IsActive = true };
            userMember.PasswordHash = hasher.HashPassword(userMember, "TestPass!1");
            userMember.UserRoles.Add(new UserRole { User = userMember, RoleId = 1 });

            var userPending = new User { FullName = "OrgA Pending", Email = "orga.pending@test.local", IsActive = true };
            userPending.PasswordHash = hasher.HashPassword(userPending, "TestPass!1");
            userPending.UserRoles.Add(new UserRole { User = userPending, RoleId = 1 });

            var userOrgB = new User { FullName = "OrgB Admin", Email = "orgb.admin@test.local", IsActive = true };
            userOrgB.PasswordHash = hasher.HashPassword(userOrgB, "TestPass!1");
            userOrgB.UserRoles.Add(new UserRole { User = userOrgB, RoleId = 1 });

            db.Users.AddRange(userAdmin, userMember, userPending, userOrgB);
            await db.SaveChangesAsync();

            var perms = await db.Permissions.Where(p =>
                p.PermissionName == "Organizations.View" ||
                p.PermissionName == "Organizations.Manage" ||
                p.PermissionName == "Organizations.ApproveMembers" ||
                p.PermissionName == "Resources.Allocate").ToListAsync();

            var orgAAdminRole = new Role
            {
                RoleName = "OrganizationAdmin",
                Description = "Org Admin",
                IsSystemDefined = false,
                OrganizationId = orgA.OrganizationId
            };
            foreach (var p in perms)
            {
                orgAAdminRole.RolePermissions.Add(new RolePermission { Role = orgAAdminRole, PermissionId = p.PermissionId });
            }
            db.Roles.Add(orgAAdminRole);
            await db.SaveChangesAsync();

            var memAdmin = new OrganizationMembership
            {
                OrganizationId = orgA.OrganizationId,
                UserId = userAdmin.UserId,
                MembershipStatus = "Approved",
                ApprovedAt = DateTime.UtcNow
            };
            memAdmin.MembershipRoles.Add(new OrganizationMembershipRole
            {
                OrganizationId = orgA.OrganizationId,
                RoleId = orgAAdminRole.RoleId
            });

            var memOrdinary = new OrganizationMembership
            {
                OrganizationId = orgA.OrganizationId,
                UserId = userMember.UserId,
                MembershipStatus = "Approved",
                ApprovedAt = DateTime.UtcNow
            };
            var memPending = new OrganizationMembership
            {
                OrganizationId = orgA.OrganizationId,
                UserId = userPending.UserId,
                MembershipStatus = "Pending"
            };
            var memOrgB = new OrganizationMembership
            {
                OrganizationId = orgB.OrganizationId,
                UserId = userOrgB.UserId,
                MembershipStatus = "Approved",
                ApprovedAt = DateTime.UtcNow
            };
            db.OrganizationMemberships.AddRange(memAdmin, memOrdinary, memPending, memOrgB);

            var crisis = new CrisisEvent
            {
                CrisisName = "Kelani Flood",
                CrisisType = "Flood",
                SeverityLevel = "High",
                Status = "Active",
                LocationName = "Colombo",
                Latitude = 6.93m,
                Longitude = 79.88m,
                StartDate = DateTime.UtcNow
            };
            db.CrisisEvents.Add(crisis);
            await db.SaveChangesAsync();

            var req = new CitizenRequest
            {
                UserId = userPending.UserId,
                AreaId = area.AreaId,
                CrisisId = crisis.CrisisId,
                RequestType = "Food",
                Description = "Need food packs",
                UrgencyLevel = "High",
                PeopleCount = 5,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };
            db.CitizenRequests.Add(req);
            await db.SaveChangesAsync();

            env.OrgAId = orgA.OrganizationId;
            env.OrgBId = orgB.OrganizationId;
            env.OrgAdminUserId = userAdmin.UserId;
            env.OrgAdminMembershipId = memAdmin.MembershipId;
            env.OrdinaryMemberUserId = userMember.UserId;
            env.PendingMemberUserId = userPending.UserId;
            env.OrgBMemberUserId = userOrgB.UserId;
            env.AreaId = area.AreaId;
            env.CrisisId = crisis.CrisisId;
            env.CitizenRequestId = req.RequestId;

            return env;
        }

        public HttpClient CreateClientForUser(int userId)
        {
            using var scope = Factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
            var user = db.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
                .First(u => u.UserId == userId);
            var token = jwt.GenerateToken(user);
            var client = Factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.AccessToken);
            return client;
        }

        public async ValueTask DisposeAsync()
        {
            await Factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    [Fact]
    public async Task ResponseTeams_Areas_AidRequests_Settings_And_Isolation_WorkEndToEnd()
    {
        await using var env = await OrgWorkspaceEnv.CreateAsync();
        using var adminClient = env.CreateClientForUser(env.OrgAdminUserId);
        using var memberClient = env.CreateClientForUser(env.OrdinaryMemberUserId);
        using var pendingClient = env.CreateClientForUser(env.PendingMemberUserId);
        using var orgBClient = env.CreateClientForUser(env.OrgBMemberUserId);

        // 1. Pending member and cross-org user are blocked from Org A workspace
        var pendingDash = await pendingClient.GetAsync($"/api/organizations/{env.OrgAId}/dashboard");
        Assert.Equal(HttpStatusCode.Forbidden, pendingDash.StatusCode);

        var crossOrgDash = await orgBClient.GetAsync($"/api/organizations/{env.OrgAId}/dashboard");
        Assert.Equal(HttpStatusCode.Forbidden, crossOrgDash.StatusCode);

        // 2. Ordinary approved member can read dashboard, cannot create teams
        var memberDash = await memberClient.GetAsync($"/api/organizations/{env.OrgAId}/dashboard");
        Assert.Equal(HttpStatusCode.OK, memberDash.StatusCode);

        var memberCreateTeam = await memberClient.PostAsJsonAsync($"/api/organizations/{env.OrgAId}/teams", new CreateResponseTeamRequest
        {
            TeamName = "Unauthorized Team",
            TeamType = "Medical"
        });
        Assert.Equal(HttpStatusCode.Forbidden, memberCreateTeam.StatusCode);

        // 3. OrgAdmin assigns an area to Org A
        var assignAreaRes = await adminClient.PostAsJsonAsync($"/api/organizations/{env.OrgAId}/areas", new AssignOrganizationAreaRequest
        {
            AreaId = env.AreaId,
            AssignmentStatus = "Active",
            PrimaryContact = "+94 11 222 3333"
        });
        Assert.Equal(HttpStatusCode.Created, assignAreaRes.StatusCode);

        // 4. OrgAdmin creates two response teams & adds OrgAdmin member to Team 1
        var createTeam1 = await adminClient.PostAsJsonAsync($"/api/organizations/{env.OrgAId}/teams", new CreateResponseTeamRequest
        {
            TeamName = "Alpha Rescue",
            TeamType = "Search & Rescue",
            LeaderMembershipId = env.OrgAdminMembershipId,
            AreaId = env.AreaId,
            Status = "Available"
        });
        Assert.Equal(HttpStatusCode.Created, createTeam1.StatusCode);
        var team1 = await createTeam1.Content.ReadFromJsonAsync<ResponseTeamDto>();
        Assert.NotNull(team1);
        Assert.Single(team1.Members);

        var createTeam2 = await adminClient.PostAsJsonAsync($"/api/organizations/{env.OrgAId}/teams", new CreateResponseTeamRequest
        {
            TeamName = "Beta Medical",
            TeamType = "Medical",
            LeaderMembershipId = env.OrgAdminMembershipId,
            AreaId = env.AreaId,
            Status = "Available"
        });
        Assert.Equal(HttpStatusCode.Created, createTeam2.StatusCode);
        var team2 = await createTeam2.Content.ReadFromJsonAsync<ResponseTeamDto>();
        Assert.NotNull(team2);

        // 5. Assign Team 1 to CitizenRequest -> succeeds & deploys Team 1
        var assignTeamRes = await adminClient.PostAsJsonAsync(
            $"/api/organizations/{env.OrgAId}/aid-requests/{env.CitizenRequestId}/assign-team",
            new AssignTeamToAidRequestInput { ResponseTeamId = team1.ResponseTeamId, Notes = "Dispatched immediately" });
        Assert.Equal(HttpStatusCode.OK, assignTeamRes.StatusCode);
        var assignedReq = await assignTeamRes.Content.ReadFromJsonAsync<OrganizationAidRequestDto>();
        Assert.NotNull(assignedReq);
        Assert.Equal("Assigned", assignedReq.Status);
        Assert.Equal(team1.ResponseTeamId, assignedReq.AssignedTeamId);

        // 6. Deploying Team 2 (sharing the same member) simultaneously must be rejected (conflict!)
        var conflictDeploy = await adminClient.PostAsJsonAsync(
            $"/api/organizations/{env.OrgAId}/teams/{team2.ResponseTeamId}/deployments",
            new CreateTeamDeploymentRequest { CrisisId = env.CrisisId, MissionTitle = "Conflicting Mission" });
        Assert.False(conflictDeploy.IsSuccessStatusCode);

        // 7. Organization Settings persistence
        var putSettings = await adminClient.PutAsJsonAsync($"/api/organizations/{env.OrgAId}", new UpdateOrganizationRequest
        {
            OrganizationName = "Org Alpha Updated",
            OrganizationType = "NGO",
            Website = "https://alpha.hcms.lk",
            PrimaryContactName = "Kamal Silva",
            EmergencyContactPhone = "119",
            PreferredLanguage = "si",
            EmailAlertsEnabled = false,
            CompactTables = true,
            IsActive = true
        });
        Assert.Equal(HttpStatusCode.OK, putSettings.StatusCode);
        var updatedOrg = await putSettings.Content.ReadFromJsonAsync<OrganizationResponse>();
        Assert.NotNull(updatedOrg);
        Assert.Equal("https://alpha.hcms.lk", updatedOrg.Website);
        Assert.Equal("si", updatedOrg.PreferredLanguage);
        Assert.False(updatedOrg.EmailAlertsEnabled);
        Assert.True(updatedOrg.CompactTables);

        // 8. Change Password endpoint
        var changePass = await adminClient.PostAsJsonAsync("/api/Auth/change-password", new ChangePasswordRequest
        {
            CurrentPassword = "TestPass!1",
            NewPassword = "NewTestPass!2"
        });
        Assert.Equal(HttpStatusCode.OK, changePass.StatusCode);
    }
}
