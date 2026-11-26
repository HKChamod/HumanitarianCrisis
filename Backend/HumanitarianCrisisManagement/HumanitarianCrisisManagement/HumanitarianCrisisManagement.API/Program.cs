
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.DependencyInjection;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using HumanitarianCrisisManagement.API.Authorization;
using HumanitarianCrisisManagement.API.Exceptions;
using HumanitarianCrisisManagement.API.Health;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Security.Claims;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Infrastructure Services
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "DefaultConnection connection string is not configured. Configure ConnectionStrings__DefaultConnection via environment variables or Key Vault.");
}

var aiOptionsSection = builder.Configuration.GetSection(AiProviderOptions.SectionName);
if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing"))
{
    var aiProvider = aiOptionsSection["Provider"]?.Trim();
    if (string.Equals(aiProvider, AiProviderOptions.GeminiProviderName, StringComparison.OrdinalIgnoreCase) &&
        string.IsNullOrWhiteSpace(aiOptionsSection["GeminiApiKey"]))
    {
        throw new InvalidOperationException(
            "AiProvider:GeminiApiKey is required when AiProvider:Provider is set to 'Gemini' in Production.");
    }

    if (string.Equals(aiProvider, AiProviderOptions.GroqProviderName, StringComparison.OrdinalIgnoreCase) &&
        string.IsNullOrWhiteSpace(aiOptionsSection["GroqApiKey"]))
    {
        throw new InvalidOperationException(
            "AiProvider:GroqApiKey is required when AiProvider:Provider is set to 'Groq' in Production.");
    }
}

builder.Services.Configure<AiProviderOptions>(aiOptionsSection);
builder.Services.Configure<DevelopmentSeedOptions>(
    builder.Configuration.GetSection(DevelopmentSeedOptions.SectionName));
builder.Services.AddHttpClient<GeminiAiAnalysisProvider>(client =>
{
    // Timeout is enforced per request via AiProviderOptions.GetEffectiveTimeout()
    // using a linked CancellationTokenSource so HttpClient's 100s default never cuts off longer configured timeouts.
    client.Timeout = Timeout.InfiniteTimeSpan;
});
builder.Services.AddHttpClient<GroqAiAnalysisProvider>(client =>
{
    client.Timeout = Timeout.InfiniteTimeSpan;
});
builder.Services.AddInfrastructure(connectionString);

// JWT Configuration
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "JWT signing key is not configured. Configure Jwt__Key via environment variables or Key Vault.");
}

var keyBytes = Convert.FromBase64String(jwtKey);

if (keyBytes.Length < 32)
{
    throw new InvalidOperationException(
        "JWT signing key must contain at least 32 bytes.");
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"]
    ?? throw new InvalidOperationException(
        "JWT issuer is not configured.");

var jwtAudience = builder.Configuration["Jwt:Audience"]
    ?? throw new InvalidOperationException(
        "JWT audience is not configured.");

var permissionNames = new[]
{
    "Users.View",
    "Users.Manage",

    "Organizations.View",
    "Organizations.Manage",
    "Organizations.ApproveMembers",

    "CrisisEvents.View",
    "CrisisEvents.Create",
    "CrisisEvents.Update",
    "CrisisEvents.Delete",
    "CrisisEvents.Manage",

    "CitizenRequests.View",
    "CitizenRequests.Manage",
"Areas.View",
"Areas.Manage",

"Warehouses.View",
"Warehouses.Manage",

"Inventory.View",
"Inventory.Manage",

    "ResourceAllocations.View",
    "ResourceAllocations.Manage",

"Resources.View",
    "Resources.Manage",
    "Resources.Allocate",

    "Donations.View",
    "Donations.Manage",
    "Donations.Verify",

    "Volunteers.View",
    "Volunteers.Manage",
    "Volunteers.Approve",

    "Reports.View",
    "Reports.Generate",

    "AI.View",
    "AI.Review",

    "Shelters.View",
    "Shelters.Manage",

    "Notifications.View",
    "AuditLogs.View",

    "Roles.Manage",
    "Permissions.View"
};

builder.Services.AddAuthorization(options =>
{
    foreach (var permission in permissionNames)
    {
        options.AddPolicy(permission, policy =>
        {
            policy.RequireAuthenticatedUser();

            policy.AddRequirements(
                new PermissionRequirement(permission));
        });
    }
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),

            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,

            ValidateAudience = true,
            ValidAudience = jwtAudience,

            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),

            RoleClaimType = ClaimTypes.Role
        };
    });

// Global Exception Handling
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// Permission-Based Authorization
builder.Services.AddScoped<
    IAuthorizationHandler,
    PermissionAuthorizationHandler>();



// CORS Configuration
const string FrontendCorsPolicy = "FrontendDevPolicy";
var allowedOrigins = (builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>())
    .Where(o => !string.IsNullOrWhiteSpace(o))
    .Select(o => o.Trim().TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (!builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing"))
{
    if (allowedOrigins.Length == 0)
    {
        throw new InvalidOperationException(
            "Cors:AllowedOrigins must be explicitly configured with at least one HTTPS origin in Production (e.g. Cors__AllowedOrigins__0).");
    }

    foreach (var origin in allowedOrigins)
    {
        if (!Uri.TryCreate(origin, UriKind.Absolute, out var originUri) ||
            !string.Equals(originUri.Scheme, Uri.UriSchemeHttps, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Invalid Production CORS origin '{origin}'. All Production CORS origins must use HTTPS.");
        }
    }
}
else if (allowedOrigins.Length == 0)
{
    allowedOrigins = ["http://localhost:5173"];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy
                .AllowAnyOrigin()
                .AllowAnyMethod()
                .AllowAnyHeader();
        }
        else
        {
            policy
                .WithOrigins(allowedOrigins)
                .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .WithHeaders("Authorization", "Content-Type", "Accept", "X-Organization-Id", "X-Correlation-ID");
        }
    });
});

// API Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddHealthChecks()
    .AddCheck<DatabaseReadinessHealthCheck>("database", tags: ["ready"]);
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 2;
});

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "HumanitarianCrisisManagement.API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter your JWT access token."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});


var app = builder.Build();

if (args.Any(a => string.Equals(a, "--seed-synthetic", StringComparison.OrdinalIgnoreCase)))
{
    if (!app.Environment.IsDevelopment())
    {
        Console.Error.WriteLine(
            $"ERROR: --seed-synthetic is strictly restricted to Development environment (current: '{app.Environment.EnvironmentName}').");
        Environment.ExitCode = 1;
        return;
    }

    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();

        var syntheticSeeder = scope.ServiceProvider.GetRequiredService<SyntheticDataSeeder>();
        var report = await syntheticSeeder.SeedAsync(app.Environment.EnvironmentName);
        Console.WriteLine(report.FormatSummary());
        return;
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"ERROR: Synthetic data seeding failed: {ex.Message}");
        Environment.ExitCode = 1;
        return;
    }
}

// HTTP Request Pipeline
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();

        var devSeeder = scope.ServiceProvider.GetRequiredService<DevelopmentUserSeeder>();
        await devSeeder.SeedAsync();
    }

    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "HumanitarianCrisisManagement.API v1");
    });
}

app.UseForwardedHeaders();
app.UseExceptionHandler();

app.UseCors(FrontendCorsPolicy);

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

static Task WriteSafeHealthResponse(HttpContext context, HealthReport report)
{
    context.Response.ContentType = "application/json";
    var payload = JsonSerializer.Serialize(new
    {
        status = report.Status.ToString(),
        checks = report.Entries.ToDictionary(
            e => e.Key,
            e => e.Value.Status.ToString())
    });
    return context.Response.WriteAsync(payload);
}

app.MapHealthChecks("/health", new HealthCheckOptions
{
    Predicate = _ => false
});
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = r => r.Tags.Contains("ready"),
    ResponseWriter = WriteSafeHealthResponse
});
app.MapControllers();

app.Run();

public partial class Program { }
