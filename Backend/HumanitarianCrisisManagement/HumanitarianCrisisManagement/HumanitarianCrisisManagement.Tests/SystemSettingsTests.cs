using System.Net;
using System.Net.Http.Json;
using System.Text;
using HumanitarianCrisisManagement.Application.DTOs.SystemSettings;
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

public class SystemSettingsTests
{
    private static readonly string TestJwtKey = Convert.ToBase64String(
        Encoding.UTF8.GetBytes("TEST_ONLY_SYNTHETIC_JWT_KEY_32_BYTES_LONG!!"));
    private const string TestJwtIssuer = "HumanitarianCrisisManagementAPI";
    private const string TestJwtAudience = "HumanitarianCrisisManagementClient";

    private sealed class SettingsTestEnv : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        public WebApplicationFactory<Program> Factory { get; }

        private SettingsTestEnv(SqliteConnection connection, WebApplicationFactory<Program> factory)
        {
            _connection = connection;
            Factory = factory;
        }

        public static async Task<SettingsTestEnv> CreateAsync()
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
                builder.UseSetting("AiProvider:GeminiApiKey", "");
                builder.UseSetting("AiProvider:GroqApiKey", "");
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                    services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                    services.AddDbContext<ApplicationDbContext>(opts => opts.UseSqlite(connection));
                });
            });

            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();

            var hasher = new PasswordHasherService();
            var adminUser = new User
            {
                FullName = "Settings Admin",
                Email = "settings.admin@test.local",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            adminUser.PasswordHash = hasher.HashPassword(adminUser, "AdminPass!1");
            adminUser.UserRoles.Add(new UserRole { User = adminUser, RoleId = 2 }); // Administrator

            var citizenUser = new User
            {
                FullName = "Settings Citizen",
                Email = "settings.citizen@test.local",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            citizenUser.PasswordHash = hasher.HashPassword(citizenUser, "CitizenPass!1");
            citizenUser.UserRoles.Add(new UserRole { User = citizenUser, RoleId = 1 }); // Citizen

            var org = new Organization
            {
                OrganizationName = "Scoped Org",
                OrganizationType = "NGO",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            var orgAdminUser = new User
            {
                FullName = "Org Admin User",
                Email = "settings.orgadmin@test.local",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            orgAdminUser.PasswordHash = hasher.HashPassword(orgAdminUser, "OrgAdminPass!1");
            orgAdminUser.UserRoles.Add(new UserRole { User = orgAdminUser, RoleId = 1 });

            db.Users.AddRange(adminUser, citizenUser, orgAdminUser);
            db.Organizations.Add(org);
            await db.SaveChangesAsync();

            return new SettingsTestEnv(connection, factory);
        }

        public HttpClient CreateClientForUser(int userId)
        {
            using var scope = Factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var jwtService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
            var user = db.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .First(u => u.UserId == userId);

            var auth = jwtService.GenerateToken(user);
            var client = Factory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth.AccessToken);
            return client;
        }

        public async ValueTask DisposeAsync()
        {
            await Factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    [Fact]
    public async Task SystemSettings_AdminCanRetrieveUpdatePersistAndAudit_WithoutExposingSecrets()
    {
        await using var env = await SettingsTestEnv.CreateAsync();
        using var adminClient = env.CreateClientForUser(1);

        // 1. Retrieve defaults
        var getRes = await adminClient.GetAsync("/api/SystemSettings");
        Assert.Equal(HttpStatusCode.OK, getRes.StatusCode);
        var initial = await getRes.Content.ReadFromJsonAsync<SystemSettingsResponse>();
        Assert.NotNull(initial);
        Assert.Equal("Database", initial.PersistenceMode);

        // 2. Update settings
        var updateReq = new UpdateSystemSettingsRequest
        {
            General = new GeneralSettingsDto
            {
                SystemDisplayName = "HCMS Updated Portal",
                ApplicationDescription = "Verified settings persistence",
                DefaultTimezone = "Asia/Colombo",
                DefaultLanguage = "si",
                DateFormat = "dd/MM/yyyy",
                TimeFormat = "12h",
                DefaultCountry = "Sri Lanka",
                DefaultCurrency = "LKR",
                ContactEmail = "ops@hcms.gov.lk",
                ContactPhone = "119"
            },
            Organization = new OrganizationSettingsDto
            {
                DefaultOrganizationType = "Hospital",
                AllowOrganizationRegistration = false,
                RequireMembershipApproval = true,
                DefaultMembershipRoleName = "Coordinator"
            },
            Operational = new OperationalSettingsDto
            {
                AllowCitizenRequestSubmission = true,
                DefaultRequestPriority = "High",
                RequireRequestReviewBeforeAllocation = true,
                DefaultAllocationBatchLimit = 250,
                DefaultShelterCapacityAlertPercent = 90,
                RequireVolunteerApprovalBeforeAssignment = true
            },
            Notification = new NotificationSettingsDto
            {
                SystemNotificationsEnabled = false,
                EnableCrisisAlerts = true,
                EnableRequestAlerts = false,
                EnableLowStockAlerts = true,
                EnableShelterAlerts = true,
                NotificationRetentionDays = 180
            }
        };

        var putRes = await adminClient.PutAsJsonAsync("/api/SystemSettings", updateReq);
        Assert.Equal(HttpStatusCode.OK, putRes.StatusCode);
        var updated = await putRes.Content.ReadFromJsonAsync<SystemSettingsResponse>();
        Assert.NotNull(updated);
        Assert.Equal("HCMS Updated Portal", updated.General.SystemDisplayName);
        Assert.Equal("si", updated.General.DefaultLanguage);
        Assert.False(updated.Notification.SystemNotificationsEnabled);

        // 3. Verify persistence via fresh DbContext & AuditLog entry
        using (var scope = env.Factory.Services.CreateScope())
        {
            var freshDb = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var savedRow = await freshDb.SystemSettings.FirstOrDefaultAsync(s => s.SettingKey == "General.SystemDisplayName");
            Assert.NotNull(savedRow);
            Assert.Equal("HCMS Updated Portal", savedRow.SettingValue);

            var audit = await freshDb.AuditLogs.OrderByDescending(a => a.AuditLogId).FirstOrDefaultAsync();
            Assert.NotNull(audit);
            Assert.Equal("SystemSettings.Updated", audit.Action);
            Assert.Equal("SystemSettings", audit.EntityType);
            Assert.DoesNotContain(TestJwtKey, audit.Summary);
        }

        // 4. Verify system-info & ai-config never expose secrets
        var infoRes = await adminClient.GetAsync("/api/SystemSettings/system-info");
        Assert.Equal(HttpStatusCode.OK, infoRes.StatusCode);
        var infoRaw = await infoRes.Content.ReadAsStringAsync();
        Assert.DoesNotContain(TestJwtKey, infoRaw);

        var aiRes = await adminClient.GetAsync("/api/SystemSettings/ai-config");
        Assert.Equal(HttpStatusCode.OK, aiRes.StatusCode);
        var aiConfig = await aiRes.Content.ReadFromJsonAsync<SafeAiConfigurationResponse>();
        Assert.NotNull(aiConfig);
        Assert.False(aiConfig.IsConfigured);
        Assert.True(aiConfig.HumanApprovalRequired);
    }

    [Fact]
    public async Task SystemSettings_RejectsUnauthorizedForbiddenAndInvalidPayloads()
    {
        await using var env = await SettingsTestEnv.CreateAsync();

        // Unauthenticated -> 401
        using var anonClient = env.Factory.CreateClient();
        var anonRes = await anonClient.GetAsync("/api/SystemSettings");
        Assert.Equal(HttpStatusCode.Unauthorized, anonRes.StatusCode);

        // Citizen -> 403
        using var citizenClient = env.CreateClientForUser(2);
        var citizenGet = await citizenClient.GetAsync("/api/SystemSettings");
        Assert.Equal(HttpStatusCode.Forbidden, citizenGet.StatusCode);
        var citizenPut = await citizenClient.PutAsJsonAsync("/api/SystemSettings", new UpdateSystemSettingsRequest());
        Assert.Equal(HttpStatusCode.Forbidden, citizenPut.StatusCode);

        // Org-scoped user without global Roles.Manage -> 403
        using var orgClient = env.CreateClientForUser(3);
        var orgPut = await orgClient.PutAsJsonAsync("/api/SystemSettings", new UpdateSystemSettingsRequest());
        Assert.Equal(HttpStatusCode.Forbidden, orgPut.StatusCode);

        // Invalid payload from Admin -> 400
        using var adminClient = env.CreateClientForUser(1);
        var invalidReq = new UpdateSystemSettingsRequest();
        invalidReq.General.DefaultLanguage = "fr"; // invalid
        invalidReq.Notification.NotificationRetentionDays = 1; // below min 7
        var badRes = await adminClient.PutAsJsonAsync("/api/SystemSettings", invalidReq);
        Assert.Equal(HttpStatusCode.BadRequest, badRes.StatusCode);
    }

    [Fact]
    public async Task GetSettingsAsync_ImportsFileSettingsOnceWhenTableIsEmpty_WithoutOverwritingExistingDbRows()
    {
        var tempDir = Path.Combine(Path.GetTempPath(), "hcms-settings-import-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tempDir);
        var tempFile = Path.Combine(tempDir, "system-settings.json");

        try
        {
            await File.WriteAllTextAsync(tempFile, """
                {
                  "general": {
                    "systemDisplayName": "Imported HCMS Portal",
                    "defaultLanguage": "si",
                    "defaultCountry": "Sri Lanka",
                    "defaultCurrency": "LKR",
                    "contactEmail": "imported@hcms.test.local",
                    "contactPhone": "119"
                  },
                  "organization": {
                    "defaultOrganizationType": "Hospital",
                    "allowOrganizationRegistration": false,
                    "requireMembershipApproval": true,
                    "defaultMembershipRoleName": "Coordinator"
                  },
                  "operational": {
                    "allowCitizenRequestSubmission": true,
                    "defaultRequestPriority": "High",
                    "requireRequestReviewBeforeAllocation": true,
                    "defaultAllocationBatchLimit": 250,
                    "defaultShelterCapacityAlertPercent": 90,
                    "requireVolunteerApprovalBeforeAssignment": true
                  },
                  "notification": {
                    "systemNotificationsEnabled": false,
                    "enableCrisisAlerts": true,
                    "enableRequestAlerts": false,
                    "enableLowStockAlerts": true,
                    "enableShelterAlerts": true,
                    "notificationRetentionDays": 60
                  }
                }
                """);

            await using var env = await SettingsTestEnv.CreateAsync();
            using var scope = env.Factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var audit = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
            var ai = scope.ServiceProvider.GetRequiredService<IAiDecisionSupportService>();
            var aiOpts = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<HumanitarianCrisisManagement.Application.Options.AiProviderOptions>>();
            var config = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();

            var service = new SystemSettingsService(db, audit, ai, aiOpts, config, tempFile);

            var imported = await service.GetSettingsAsync();
            Assert.Equal("Database", imported.PersistenceMode);
            Assert.Equal("Imported HCMS Portal", imported.General.SystemDisplayName);
            Assert.Equal("si", imported.General.DefaultLanguage);
            Assert.Equal(250, imported.Operational.DefaultAllocationBatchLimit);
            Assert.Equal(60, imported.Notification.NotificationRetentionDays);
            Assert.False(imported.Notification.SystemNotificationsEnabled);
            Assert.True(File.Exists(tempFile));

            var dbCount = await db.SystemSettings.CountAsync();
            Assert.True(dbCount > 0);

            // Modify the file on disk; subsequent read must keep DB values and not overwrite them.
            await File.WriteAllTextAsync(tempFile, """
                {
                  "general": {
                    "systemDisplayName": "Should Not Overwrite",
                    "defaultLanguage": "ta",
                    "defaultCountry": "Sri Lanka",
                    "defaultCurrency": "LKR",
                    "contactEmail": "overwrite@hcms.test.local",
                    "contactPhone": "119"
                  }
                }
                """);

            var secondRead = await service.GetSettingsAsync();
            Assert.Equal("Imported HCMS Portal", secondRead.General.SystemDisplayName);
            Assert.Equal("si", secondRead.General.DefaultLanguage);
        }
        finally
        {
            if (Directory.Exists(tempDir))
            {
                Directory.Delete(tempDir, recursive: true);
            }
        }
    }
}
