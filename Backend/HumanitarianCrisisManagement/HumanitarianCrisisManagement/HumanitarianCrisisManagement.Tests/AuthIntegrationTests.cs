using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
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
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

/// <summary>
/// Authentication & DevelopmentUserSeeder integration tests exercising the real ASP.NET Core HTTP pipeline:
/// POST /api/Auth/register, POST /api/Auth/login, GET /api/Auth/me, PasswordHasherService, and DevelopmentUserSeeder.
/// Uses isolated per-test SQLite in-memory databases; never connects to HumanitarianCrisisDB.
/// </summary>
public class AuthIntegrationTests
{
    private const string CitizenTestEmail = "citizen.test+20261116@example.com";
    private const string ResponderTestEmail = "responder.test+20261116@example.com";
    private const string InactiveTestEmail = "inactive.test+20261116@example.com";
    private const string SyntheticTestPassword = "SyntheticAuthPassword!2026";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    [Fact]
    public async Task RegisterThenLogin_CitizenAccount_Returns200WithJwtAndValidMeProfile()
    {
        await using var env = await AuthTestEnvironment.CreateAsync();
        using var client = env.CreateClient();

        var registerRes = await client.PostAsJsonAsync(
            "/api/auth/register",
            new RegisterRequest
            {
                FullName = "Synthetic Test Citizen",
                Email = CitizenTestEmail,
                Password = SyntheticTestPassword,
                PhoneNumber = "0701112223"
            });
        Assert.Equal(HttpStatusCode.Created, registerRes.StatusCode);

        var regBody = await registerRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(regBody);
        Assert.False(string.IsNullOrWhiteSpace(regBody.AccessToken));
        Assert.Equal(CitizenTestEmail, regBody.Email);

        var loginRes = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = CitizenTestEmail,
                Password = SyntheticTestPassword
            });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var loginBody = await loginRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(loginBody);
        Assert.False(string.IsNullOrWhiteSpace(loginBody.AccessToken));
        Assert.Equal("Bearer", loginBody.TokenType);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody.AccessToken);
        var meRes = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);

        var me = await meRes.Content.ReadFromJsonAsync<CurrentUserResponse>(JsonOptions);
        Assert.NotNull(me);
        Assert.Contains("Citizen", me.Roles);
        Assert.Equal(CitizenTestEmail, me.Email);
    }

    [Fact]
    public async Task Login_WithMixedCaseAndWhitespaceEmail_NormalizesAndReturns200WithJwt()
    {
        await using var env = await AuthTestEnvironment.CreateAsync(seedConfiguredUsers: true);
        using var client = env.CreateClient();

        var loginRes = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = "  CITIZEN.TEST+20261116@EXAMPLE.COM  ",
                Password = SyntheticTestPassword
            });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var body = await loginRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(CitizenTestEmail, body.Email);
        Assert.False(string.IsNullOrWhiteSpace(body.AccessToken));
    }

    [Fact]
    public async Task Login_SeededResponderAccount_Returns200WithResponderRoleAndPermissions()
    {
        await using var env = await AuthTestEnvironment.CreateAsync(seedConfiguredUsers: true);
        using var client = env.CreateClient();

        var loginRes = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = ResponderTestEmail,
                Password = SyntheticTestPassword
            });
        Assert.Equal(HttpStatusCode.OK, loginRes.StatusCode);

        var loginBody = await loginRes.Content.ReadFromJsonAsync<AuthResponse>(JsonOptions);
        Assert.NotNull(loginBody);
        Assert.False(string.IsNullOrWhiteSpace(loginBody.AccessToken));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", loginBody.AccessToken);
        var meRes = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, meRes.StatusCode);

        var me = await meRes.Content.ReadFromJsonAsync<CurrentUserResponse>(JsonOptions);
        Assert.NotNull(me);
        Assert.Contains("Responder", me.Roles);
        Assert.Contains("CitizenRequests.Manage", me.Permissions);
    }

    [Fact]
    public async Task Login_InvalidPassword_Returns401AndNeverEmitsJwt()
    {
        await using var env = await AuthTestEnvironment.CreateAsync(seedConfiguredUsers: true);
        using var client = env.CreateClient();

        var loginRes = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = CitizenTestEmail,
                Password = "WrongPassword!999"
            });
        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);

        var rawBody = await loginRes.Content.ReadAsStringAsync();
        Assert.DoesNotContain("accessToken", rawBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_NonExistingEmail_Returns401AndNeverEmitsJwt()
    {
        await using var env = await AuthTestEnvironment.CreateAsync(seedConfiguredUsers: true);
        using var client = env.CreateClient();

        var loginRes = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = "missing.user+20261116@example.com",
                Password = SyntheticTestPassword
            });
        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);

        var rawBody = await loginRes.Content.ReadAsStringAsync();
        Assert.DoesNotContain("accessToken", rawBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_InactiveAccount_Returns401AndNeverEmitsJwt()
    {
        await using var env = await AuthTestEnvironment.CreateAsync(seedConfiguredUsers: true, seedInactiveUser: true);
        using var client = env.CreateClient();

        var loginRes = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest
            {
                Email = InactiveTestEmail,
                Password = SyntheticTestPassword
            });
        Assert.Equal(HttpStatusCode.Unauthorized, loginRes.StatusCode);

        var rawBody = await loginRes.Content.ReadAsStringAsync();
        Assert.DoesNotContain("accessToken", rawBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task DevelopmentUserSeeder_IsIdempotentAndProducesCompatiblePasswordHashes()
    {
        await using var env = await AuthTestEnvironment.CreateAsync(seedConfiguredUsers: true);

        await using var scope = env.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();

        var seededOptions = Options.Create(new DevelopmentSeedOptions
        {
            Enabled = true,
            Users =
            [
                new DevelopmentSeedUserOption
                {
                    FullName = "Duplicate Attempt Citizen",
                    Email = CitizenTestEmail.ToUpperInvariant(),
                    Password = SyntheticTestPassword,
                    RoleName = "Citizen"
                }
            ]
        });

        var seeder = new DevelopmentUserSeeder(
            db,
            hasher,
            seededOptions,
            NullLogger<DevelopmentUserSeeder>.Instance);

        // Running seeder again must not create duplicate users
        await seeder.SeedAsync();

        var matchingUsers = await db.Users.AsNoTracking()
            .Where(u => u.Email == CitizenTestEmail)
            .ToListAsync();
        var user = Assert.Single(matchingUsers);
        Assert.True(user.IsActive);
        Assert.True(hasher.VerifyPassword(user, user.PasswordHash, SyntheticTestPassword));
        Assert.False(hasher.VerifyPassword(user, user.PasswordHash, "IncorrectPassword"));
    }

    [Fact]
    public void PasswordHasherService_HashAndVerify_RoundTripCompatible()
    {
        var hasher = new PasswordHasherService();
        var user = new User
        {
            UserId = 1,
            FullName = "Hash Test",
            Email = CitizenTestEmail
        };

        var hash = hasher.HashPassword(user, SyntheticTestPassword);
        Assert.False(string.IsNullOrWhiteSpace(hash));
        Assert.NotEqual(SyntheticTestPassword, hash);
        Assert.True(hasher.VerifyPassword(user, hash, SyntheticTestPassword));
        Assert.False(hasher.VerifyPassword(user, hash, "DifferentPassword!123"));
    }

    // =========================================================================
    // Isolated SQLite In-Memory Test Host
    // =========================================================================

    private sealed class AuthTestEnvironment : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly AuthWebAppFactory _factory;

        private AuthTestEnvironment(SqliteConnection connection, AuthWebAppFactory factory)
        {
            _connection = connection;
            _factory = factory;
        }

        public static async Task<AuthTestEnvironment> CreateAsync(
            bool seedConfiguredUsers = false,
            bool seedInactiveUser = false)
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var factory = new AuthWebAppFactory(connection);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.EnsureCreatedAsync();

                if (seedConfiguredUsers)
                {
                    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();
                    var seeder = new DevelopmentUserSeeder(
                        db,
                        hasher,
                        Options.Create(new DevelopmentSeedOptions
                        {
                            Enabled = true,
                            Users =
                            [
                                new DevelopmentSeedUserOption
                                {
                                    FullName = "Synthetic Test Citizen",
                                    Email = CitizenTestEmail,
                                    Password = SyntheticTestPassword,
                                    RoleName = "Citizen",
                                    PhoneNumber = "0701112223"
                                },
                                new DevelopmentSeedUserOption
                                {
                                    FullName = "Synthetic Test Responder",
                                    Email = ResponderTestEmail,
                                    Password = SyntheticTestPassword,
                                    RoleName = "Responder",
                                    PhoneNumber = "0701112224"
                                }
                            ]
                        }),
                        NullLogger<DevelopmentUserSeeder>.Instance);

                    await seeder.SeedAsync();
                }

                if (seedInactiveUser)
                {
                    var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasherService>();
                    var inactiveUser = new User
                    {
                        FullName = "Synthetic Inactive Citizen",
                        Email = InactiveTestEmail,
                        IsActive = false,
                        CreatedAt = DateTime.UtcNow
                    };
                    inactiveUser.PasswordHash = hasher.HashPassword(inactiveUser, SyntheticTestPassword);
                    inactiveUser.UserRoles.Add(new UserRole { User = inactiveUser, RoleId = 1 });
                    db.Users.Add(inactiveUser);
                    await db.SaveChangesAsync();
                }
            }

            return new AuthTestEnvironment(connection, factory);
        }

        public HttpClient CreateClient() =>
            _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });

        public AsyncServiceScope CreateScope() => _factory.Services.CreateAsyncScope();

        public async ValueTask DisposeAsync()
        {
            await _factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    private sealed class AuthWebAppFactory : WebApplicationFactory<Program>
    {
        private const string TestIssuer = "HumanitarianCrisisManagementAPI.AuthTest";
        private const string TestAudience = "HumanitarianCrisisManagementClient.AuthTest";

        private readonly SqliteConnection _connection;
        private readonly string _ephemeralJwtKeyBase64;

        public AuthWebAppFactory(SqliteConnection connection)
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
            throw new InvalidOperationException("AI provider is not used in auth tests.");

        public Task<Application.DTOs.AiRecommendations.AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("AI diagnostic is not used in auth tests.");
    }
}
