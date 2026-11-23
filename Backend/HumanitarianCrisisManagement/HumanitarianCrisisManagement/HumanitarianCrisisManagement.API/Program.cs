
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.DependencyInjection;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using HumanitarianCrisisManagement.API.Exceptions;
using System.Security.Claims;
using HumanitarianCrisisManagement.API.Authorization;
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);

// Infrastructure Services
var connectionString = builder.Configuration
    .GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "DefaultConnection connection string is not configured.");

builder.Services.Configure<AiProviderOptions>(
    builder.Configuration.GetSection(AiProviderOptions.SectionName));
builder.Services.AddHttpClient<GeminiAiAnalysisProvider>(client =>
{
    // Timeout is enforced per request via AiProviderOptions.GetEffectiveTimeout()
    // using a linked CancellationTokenSource so HttpClient's 100s default never cuts off longer configured timeouts.
    client.Timeout = Timeout.InfiniteTimeSpan;
});
builder.Services.AddInfrastructure(connectionString);

// JWT Configuration
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException(
        "JWT signing key is not configured.");

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
    "AI.Review"
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
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>();

if (allowedOrigins == null || allowedOrigins.Length == 0)
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

// HTTP Request Pipeline
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Database.Migrate();
    }

    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint(
            "/swagger/v1/swagger.json",
            "HumanitarianCrisisManagement.API v1");
    });
}

app.UseExceptionHandler();

app.UseCors(FrontendCorsPolicy);

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
