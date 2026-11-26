using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.SystemSettings;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class SystemSettingsService : ISystemSettingsService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    private static readonly SemaphoreSlim FileLock = new(1, 1);

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IAiDecisionSupportService _aiService;
    private readonly AiProviderOptions _aiOptions;
    private readonly IConfiguration _configuration;
    private readonly string _settingsFilePath;

    public SystemSettingsService(
        ApplicationDbContext context,
        IAuditLogService auditLogService,
        IAiDecisionSupportService aiService,
        IOptions<AiProviderOptions> aiOptions,
        IConfiguration configuration,
        string? settingsFilePath = null)
    {
        _context = context;
        _auditLogService = auditLogService;
        _aiService = aiService;
        _aiOptions = aiOptions.Value;
        _configuration = configuration;
        _settingsFilePath = string.IsNullOrWhiteSpace(settingsFilePath)
            ? Path.Combine(AppContext.BaseDirectory, "App_Data", "system-settings.json")
            : settingsFilePath;
    }

    private bool IsStrictDatabaseOnlyEnvironment
    {
        get
        {
            var env = _configuration["ASPNETCORE_ENVIRONMENT"]
                ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
                ?? string.Empty;
            return string.Equals(env, "Production", StringComparison.OrdinalIgnoreCase)
                || string.Equals(env, "Staging", StringComparison.OrdinalIgnoreCase);
        }
    }

    public async Task<SystemSettingsResponse> GetSettingsAsync(CancellationToken cancellationToken = default)
    {
        if (IsStrictDatabaseOnlyEnvironment)
        {
            return await LoadFromDatabaseAsync(cancellationToken, allowFileImport: false);
        }

        if (await CanUseDatabaseTableAsync(cancellationToken))
        {
            return await LoadFromDatabaseAsync(cancellationToken, allowFileImport: true);
        }

        return await LoadFromFileAsync(cancellationToken);
    }

    public async Task<SystemSettingsResponse> UpdateSettingsAsync(
        UpdateSystemSettingsRequest request,
        int actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default)
    {
        if (request == null)
        {
            throw new ArgumentException("Settings payload is required.");
        }

        var normalized = NormalizeRequest(request);
        var before = await GetSettingsAsync(cancellationToken);
        var now = DateTime.UtcNow;

        SystemSettingsResponse saved;
        if (IsStrictDatabaseOnlyEnvironment)
        {
            saved = await SaveToDatabaseAsync(normalized, actorUserId, actorEmail, now, cancellationToken);
        }
        else if (await CanUseDatabaseTableAsync(cancellationToken))
        {
            saved = await SaveToDatabaseAsync(normalized, actorUserId, actorEmail, now, cancellationToken);
        }
        else
        {
            saved = await SaveToFileAsync(normalized, actorEmail, now, cancellationToken);
        }

        var changedSections = ComputeChangedSections(before, saved);
        var summary = changedSections.Count == 0
            ? "Updated system settings (no value changes detected)."
            : $"Updated system settings sections: {string.Join(", ", changedSections)}.";

        await _auditLogService.RecordAsync(
            actorUserId,
            actorEmail,
            "SystemSettings.Updated",
            "SystemSettings",
            saved.PersistenceMode,
            summary);

        return saved;
    }

    public async Task<SystemInformationResponse> GetSystemInformationAsync(
        bool isHttps,
        CancellationToken cancellationToken = default)
    {
        var dbConnected = false;
        try
        {
            dbConnected = await _context.Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            dbConnected = false;
        }

        var dbTableReady = dbConnected && await CanUseDatabaseTableAsync(cancellationToken);
        var persistenceMode = dbTableReady ? "Database" : "ServerFilePendingMigration";

        var providerName = _context.Database.ProviderName ?? "Unknown";
        var simpleProvider = providerName.Contains("SqlServer", StringComparison.OrdinalIgnoreCase)
            ? "Microsoft SQL Server"
            : providerName.Contains("Sqlite", StringComparison.OrdinalIgnoreCase)
                ? "SQLite"
                : providerName;

        var jwtKey = _configuration["Jwt:Key"];
        var jwtIssuer = _configuration["Jwt:Issuer"];
        var jwtAudience = _configuration["Jwt:Audience"];
        var jwtConfigured = !string.IsNullOrWhiteSpace(jwtKey)
                            && !string.IsNullOrWhiteSpace(jwtIssuer)
                            && !string.IsNullOrWhiteSpace(jwtAudience);

        var expMinutes = int.TryParse(_configuration["Jwt:AccessTokenExpirationMinutes"], out var parsedExp)
            ? parsedExp
            : 60;

        var aiStatus = _aiService.GetProviderStatus();
        var envName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
        var version = Assembly.GetEntryAssembly()?.GetName().Version?.ToString() ?? "1.0.0.0";

        var modules = new List<ModuleHealthItemDto>
        {
            new()
            {
                Name = "Database Connectivity",
                Status = dbConnected ? "Healthy" : "Unavailable",
                Detail = dbConnected ? $"{simpleProvider} connection verified." : "Unable to connect to database."
            },
            new()
            {
                Name = "System Settings Persistence",
                Status = dbTableReady ? "Healthy" : "Degraded",
                Detail = dbTableReady
                    ? "Persisting to SQL Server SystemSettings table."
                    : "Using server-side file store; EF Core SystemSettings migration pending authorization."
            },
            new()
            {
                Name = "Authentication & RBAC",
                Status = jwtConfigured ? "Healthy" : "Degraded",
                Detail = jwtConfigured ? "JWT Bearer & permission policies active." : "JWT configuration incomplete."
            },
            new()
            {
                Name = "AI Decision Support",
                Status = aiStatus.IsConfigured ? "Healthy" : "Not configured",
                Detail = aiStatus.Message
            },
            new()
            {
                Name = "Audit Logging",
                Status = dbConnected ? "Healthy" : "Unavailable",
                Detail = dbConnected ? "AuditLogs table active." : "Audit storage unavailable."
            }
        };

        var overall = !dbConnected
            ? "Unavailable"
            : modules.Any(m => m.Status == "Degraded")
                ? "Degraded"
                : "Healthy";

        return new SystemInformationResponse
        {
            ApplicationName = "Humanitarian Crisis Management System (HCMS)",
            BackendVersion = version,
            DotNetRuntimeVersion = RuntimeInformation.FrameworkDescription,
            EnvironmentName = envName,
            ServerUtcTime = DateTime.UtcNow,
            DatabaseProvider = simpleProvider,
            DatabaseStatus = dbConnected ? "Healthy" : "Unavailable",
            OverallStatus = overall,
            HttpsEnabled = isHttps,
            AuthenticationMethod = "JWT Bearer (RBAC + Organization-Scoped Permissions)",
            JwtConfigured = jwtConfigured,
            JwtAccessTokenExpirationMinutes = expMinutes,
            PersistenceMode = persistenceMode,
            Modules = modules
        };
    }

    public SafeAiConfigurationResponse GetSafeAiConfiguration()
    {
        var liveStatus = _aiService.GetProviderStatus();
        var activeProvider = _aiOptions.IsGroqConfigured
            ? "Groq"
            : _aiOptions.IsGeminiConfigured
                ? "Gemini"
                : "None";

        var modelName = activeProvider switch
        {
            "Groq" => _aiOptions.GetEffectiveGroqModel(),
            "Gemini" => _aiOptions.GetEffectiveModel(),
            _ => "None"
        };

        return new SafeAiConfigurationResponse
        {
            ConfiguredProvider = string.IsNullOrWhiteSpace(_aiOptions.Provider) ? "None" : _aiOptions.Provider,
            ActiveProvider = activeProvider,
            AvailableProviders = ["None", "Groq", "Gemini"],
            IsConfigured = liveStatus.IsConfigured,
            Status = liveStatus.IsConfigured ? "Healthy" : "Not configured",
            Message = liveStatus.Message,
            ModelName = modelName,
            TimeoutSeconds = (int)_aiOptions.GetEffectiveTimeout().TotalSeconds,
            IncludeSanitizedDescriptions = _aiOptions.IncludeSanitizedDescriptions,
            HumanApprovalRequired = true,
            GeminiKeyConfigured = _aiOptions.IsGeminiConfigured,
            GroqKeyConfigured = _aiOptions.IsGroqConfigured,
            SetupInstructions = liveStatus.IsConfigured
                ? "Provider API keys are managed securely via .NET User Secrets (dev) or server environment variables."
                : "Configure AiProvider:GroqApiKey or AiProvider:GeminiApiKey via dotnet user-secrets (local) or server environment variables (production)."
        };
    }

    private async Task<bool> CanUseDatabaseTableAsync(CancellationToken ct)
    {
        try
        {
            _ = await _context.SystemSettings.AsNoTracking().Take(1).ToListAsync(ct);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private async Task<SystemSettingsResponse> LoadFromDatabaseAsync(
        CancellationToken ct,
        bool allowFileImport = true)
    {
        var rows = await _context.SystemSettings
            .AsNoTracking()
            .Include(s => s.UpdatedByUser)
            .ToListAsync(ct);

        var defaults = new SystemSettingsResponse { PersistenceMode = "Database" };
        if (rows.Count == 0)
        {
            if (allowFileImport)
            {
                var imported = await TryImportFromFileOnceAsync(ct);
                if (imported != null)
                {
                    return imported;
                }
            }
            return defaults;
        }

        var map = rows.ToDictionary(r => r.SettingKey, r => r.SettingValue, StringComparer.OrdinalIgnoreCase);
        ApplyMapToResponse(map, defaults);

        var latest = rows.OrderByDescending(r => r.UpdatedAt).First();
        defaults.UpdatedAt = latest.UpdatedAt;
        defaults.UpdatedByEmail = latest.UpdatedByUser?.Email;
        defaults.PersistenceMode = "Database";
        return defaults;
    }

    private async Task<SystemSettingsResponse> SaveToDatabaseAsync(
        UpdateSystemSettingsRequest request,
        int actorUserId,
        string? actorEmail,
        DateTime now,
        CancellationToken ct)
    {
        var entries = FlattenToEntries(request);
        var existingRows = await _context.SystemSettings.ToListAsync(ct);
        var byKey = existingRows.ToDictionary(r => r.SettingKey, r => r, StringComparer.OrdinalIgnoreCase);

        foreach (var (key, category, value) in entries)
        {
            if (byKey.TryGetValue(key, out var row))
            {
                row.Category = category;
                row.SettingValue = value;
                row.UpdatedAt = now;
                row.UpdatedByUserId = actorUserId;
            }
            else
            {
                _context.SystemSettings.Add(new SystemSetting
                {
                    SettingKey = key,
                    Category = category,
                    SettingValue = value,
                    UpdatedAt = now,
                    UpdatedByUserId = actorUserId
                });
            }
        }

        await _context.SaveChangesAsync(ct);

        return new SystemSettingsResponse
        {
            General = request.General,
            Organization = request.Organization,
            Operational = request.Operational,
            Notification = request.Notification,
            UpdatedAt = now,
            UpdatedByEmail = actorEmail,
            PersistenceMode = "Database"
        };
    }

    private async Task<SystemSettingsResponse?> TryImportFromFileOnceAsync(CancellationToken ct)
    {
        if (!File.Exists(_settingsFilePath))
        {
            return null;
        }

        var fileSettings = await LoadFromFileAsync(ct);
        var normalized = NormalizeRequest(new UpdateSystemSettingsRequest
        {
            General = fileSettings.General,
            Organization = fileSettings.Organization,
            Operational = fileSettings.Operational,
            Notification = fileSettings.Notification
        });

        await using var tx = await _context.Database.BeginTransactionAsync(ct);
        if (await _context.SystemSettings.AnyAsync(ct))
        {
            await tx.RollbackAsync(ct);
            return null;
        }

        var now = fileSettings.UpdatedAt ?? DateTime.UtcNow;
        foreach (var (key, category, value) in FlattenToEntries(normalized))
        {
            _context.SystemSettings.Add(new SystemSetting
            {
                SettingKey = key,
                Category = category,
                SettingValue = value,
                UpdatedAt = now,
                UpdatedByUserId = null
            });
        }

        await _context.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return new SystemSettingsResponse
        {
            General = normalized.General,
            Organization = normalized.Organization,
            Operational = normalized.Operational,
            Notification = normalized.Notification,
            UpdatedAt = now,
            UpdatedByEmail = fileSettings.UpdatedByEmail,
            PersistenceMode = "Database"
        };
    }

    private async Task<SystemSettingsResponse> LoadFromFileAsync(CancellationToken ct)
    {
        await FileLock.WaitAsync(ct);
        try
        {
            if (!File.Exists(_settingsFilePath))
            {
                return new SystemSettingsResponse { PersistenceMode = "ServerFilePendingMigration" };
            }

            var json = await File.ReadAllTextAsync(_settingsFilePath, ct);
            var parsed = JsonSerializer.Deserialize<SystemSettingsResponse>(json, JsonOptions);
            if (parsed == null)
            {
                return new SystemSettingsResponse { PersistenceMode = "ServerFilePendingMigration" };
            }

            parsed.PersistenceMode = "ServerFilePendingMigration";
            return parsed;
        }
        finally
        {
            FileLock.Release();
        }
    }

    private async Task<SystemSettingsResponse> SaveToFileAsync(
        UpdateSystemSettingsRequest request,
        string? actorEmail,
        DateTime now,
        CancellationToken ct)
    {
        var payload = new SystemSettingsResponse
        {
            General = request.General,
            Organization = request.Organization,
            Operational = request.Operational,
            Notification = request.Notification,
            UpdatedAt = now,
            UpdatedByEmail = actorEmail,
            PersistenceMode = "ServerFilePendingMigration"
        };

        await FileLock.WaitAsync(ct);
        try
        {
            var dir = Path.GetDirectoryName(_settingsFilePath);
            if (!string.IsNullOrWhiteSpace(dir))
            {
                Directory.CreateDirectory(dir);
            }

            var json = JsonSerializer.Serialize(payload, JsonOptions);
            await File.WriteAllTextAsync(_settingsFilePath, json, ct);
            return payload;
        }
        finally
        {
            FileLock.Release();
        }
    }

    private static UpdateSystemSettingsRequest NormalizeRequest(UpdateSystemSettingsRequest req) => new()
    {
        General = new GeneralSettingsDto
        {
            SystemDisplayName = req.General.SystemDisplayName.Trim(),
            ApplicationDescription = req.General.ApplicationDescription?.Trim() ?? string.Empty,
            DefaultTimezone = req.General.DefaultTimezone.Trim(),
            DefaultLanguage = req.General.DefaultLanguage.Trim(),
            DateFormat = req.General.DateFormat.Trim(),
            TimeFormat = req.General.TimeFormat.Trim(),
            DefaultCountry = req.General.DefaultCountry.Trim(),
            DefaultCurrency = req.General.DefaultCurrency.Trim().ToUpperInvariant(),
            ContactEmail = req.General.ContactEmail?.Trim() ?? string.Empty,
            ContactPhone = req.General.ContactPhone?.Trim() ?? string.Empty
        },
        Organization = new OrganizationSettingsDto
        {
            DefaultOrganizationType = req.Organization.DefaultOrganizationType.Trim(),
            AllowOrganizationRegistration = req.Organization.AllowOrganizationRegistration,
            RequireMembershipApproval = req.Organization.RequireMembershipApproval,
            DefaultMembershipRoleName = req.Organization.DefaultMembershipRoleName.Trim()
        },
        Operational = new OperationalSettingsDto
        {
            AllowCitizenRequestSubmission = req.Operational.AllowCitizenRequestSubmission,
            DefaultRequestPriority = req.Operational.DefaultRequestPriority.Trim(),
            RequireRequestReviewBeforeAllocation = req.Operational.RequireRequestReviewBeforeAllocation,
            DefaultAllocationBatchLimit = req.Operational.DefaultAllocationBatchLimit,
            DefaultShelterCapacityAlertPercent = req.Operational.DefaultShelterCapacityAlertPercent,
            RequireVolunteerApprovalBeforeAssignment = req.Operational.RequireVolunteerApprovalBeforeAssignment
        },
        Notification = new NotificationSettingsDto
        {
            SystemNotificationsEnabled = req.Notification.SystemNotificationsEnabled,
            EnableCrisisAlerts = req.Notification.EnableCrisisAlerts,
            EnableRequestAlerts = req.Notification.EnableRequestAlerts,
            EnableLowStockAlerts = req.Notification.EnableLowStockAlerts,
            EnableShelterAlerts = req.Notification.EnableShelterAlerts,
            NotificationRetentionDays = req.Notification.NotificationRetentionDays
        }
    };

    private static List<(string Key, string Category, string Value)> FlattenToEntries(UpdateSystemSettingsRequest req) =>
    [
        ("General.SystemDisplayName", "General", req.General.SystemDisplayName),
        ("General.ApplicationDescription", "General", req.General.ApplicationDescription),
        ("General.DefaultTimezone", "General", req.General.DefaultTimezone),
        ("General.DefaultLanguage", "General", req.General.DefaultLanguage),
        ("General.DateFormat", "General", req.General.DateFormat),
        ("General.TimeFormat", "General", req.General.TimeFormat),
        ("General.DefaultCountry", "General", req.General.DefaultCountry),
        ("General.DefaultCurrency", "General", req.General.DefaultCurrency),
        ("General.ContactEmail", "General", req.General.ContactEmail),
        ("General.ContactPhone", "General", req.General.ContactPhone),

        ("Organization.DefaultOrganizationType", "Organization", req.Organization.DefaultOrganizationType),
        ("Organization.AllowOrganizationRegistration", "Organization", req.Organization.AllowOrganizationRegistration.ToString()),
        ("Organization.RequireMembershipApproval", "Organization", req.Organization.RequireMembershipApproval.ToString()),
        ("Organization.DefaultMembershipRoleName", "Organization", req.Organization.DefaultMembershipRoleName),

        ("Operational.AllowCitizenRequestSubmission", "Operational", req.Operational.AllowCitizenRequestSubmission.ToString()),
        ("Operational.DefaultRequestPriority", "Operational", req.Operational.DefaultRequestPriority),
        ("Operational.RequireRequestReviewBeforeAllocation", "Operational", req.Operational.RequireRequestReviewBeforeAllocation.ToString()),
        ("Operational.DefaultAllocationBatchLimit", "Operational", req.Operational.DefaultAllocationBatchLimit.ToString()),
        ("Operational.DefaultShelterCapacityAlertPercent", "Operational", req.Operational.DefaultShelterCapacityAlertPercent.ToString()),
        ("Operational.RequireVolunteerApprovalBeforeAssignment", "Operational", req.Operational.RequireVolunteerApprovalBeforeAssignment.ToString()),

        ("Notification.SystemNotificationsEnabled", "Notification", req.Notification.SystemNotificationsEnabled.ToString()),
        ("Notification.EnableCrisisAlerts", "Notification", req.Notification.EnableCrisisAlerts.ToString()),
        ("Notification.EnableRequestAlerts", "Notification", req.Notification.EnableRequestAlerts.ToString()),
        ("Notification.EnableLowStockAlerts", "Notification", req.Notification.EnableLowStockAlerts.ToString()),
        ("Notification.EnableShelterAlerts", "Notification", req.Notification.EnableShelterAlerts.ToString()),
        ("Notification.NotificationRetentionDays", "Notification", req.Notification.NotificationRetentionDays.ToString()),
    ];

    private static void ApplyMapToResponse(Dictionary<string, string> map, SystemSettingsResponse target)
    {
        string GetStr(string key, string fallback) => map.TryGetValue(key, out var val) ? val : fallback;
        bool GetBool(string key, bool fallback) => map.TryGetValue(key, out var val) && bool.TryParse(val, out var b) ? b : fallback;
        int GetInt(string key, int fallback) => map.TryGetValue(key, out var val) && int.TryParse(val, out var n) ? n : fallback;

        target.General.SystemDisplayName = GetStr("General.SystemDisplayName", target.General.SystemDisplayName);
        target.General.ApplicationDescription = GetStr("General.ApplicationDescription", target.General.ApplicationDescription);
        target.General.DefaultTimezone = GetStr("General.DefaultTimezone", target.General.DefaultTimezone);
        target.General.DefaultLanguage = GetStr("General.DefaultLanguage", target.General.DefaultLanguage);
        target.General.DateFormat = GetStr("General.DateFormat", target.General.DateFormat);
        target.General.TimeFormat = GetStr("General.TimeFormat", target.General.TimeFormat);
        target.General.DefaultCountry = GetStr("General.DefaultCountry", target.General.DefaultCountry);
        target.General.DefaultCurrency = GetStr("General.DefaultCurrency", target.General.DefaultCurrency);
        target.General.ContactEmail = GetStr("General.ContactEmail", target.General.ContactEmail);
        target.General.ContactPhone = GetStr("General.ContactPhone", target.General.ContactPhone);

        target.Organization.DefaultOrganizationType = GetStr("Organization.DefaultOrganizationType", target.Organization.DefaultOrganizationType);
        target.Organization.AllowOrganizationRegistration = GetBool("Organization.AllowOrganizationRegistration", target.Organization.AllowOrganizationRegistration);
        target.Organization.RequireMembershipApproval = GetBool("Organization.RequireMembershipApproval", target.Organization.RequireMembershipApproval);
        target.Organization.DefaultMembershipRoleName = GetStr("Organization.DefaultMembershipRoleName", target.Organization.DefaultMembershipRoleName);

        target.Operational.AllowCitizenRequestSubmission = GetBool("Operational.AllowCitizenRequestSubmission", target.Operational.AllowCitizenRequestSubmission);
        target.Operational.DefaultRequestPriority = GetStr("Operational.DefaultRequestPriority", target.Operational.DefaultRequestPriority);
        target.Operational.RequireRequestReviewBeforeAllocation = GetBool("Operational.RequireRequestReviewBeforeAllocation", target.Operational.RequireRequestReviewBeforeAllocation);
        target.Operational.DefaultAllocationBatchLimit = GetInt("Operational.DefaultAllocationBatchLimit", target.Operational.DefaultAllocationBatchLimit);
        target.Operational.DefaultShelterCapacityAlertPercent = GetInt("Operational.DefaultShelterCapacityAlertPercent", target.Operational.DefaultShelterCapacityAlertPercent);
        target.Operational.RequireVolunteerApprovalBeforeAssignment = GetBool("Operational.RequireVolunteerApprovalBeforeAssignment", target.Operational.RequireVolunteerApprovalBeforeAssignment);

        target.Notification.SystemNotificationsEnabled = GetBool("Notification.SystemNotificationsEnabled", target.Notification.SystemNotificationsEnabled);
        target.Notification.EnableCrisisAlerts = GetBool("Notification.EnableCrisisAlerts", target.Notification.EnableCrisisAlerts);
        target.Notification.EnableRequestAlerts = GetBool("Notification.EnableRequestAlerts", target.Notification.EnableRequestAlerts);
        target.Notification.EnableLowStockAlerts = GetBool("Notification.EnableLowStockAlerts", target.Notification.EnableLowStockAlerts);
        target.Notification.EnableShelterAlerts = GetBool("Notification.EnableShelterAlerts", target.Notification.EnableShelterAlerts);
        target.Notification.NotificationRetentionDays = GetInt("Notification.NotificationRetentionDays", target.Notification.NotificationRetentionDays);
    }

    private static List<string> ComputeChangedSections(SystemSettingsResponse before, SystemSettingsResponse after)
    {
        var changed = new List<string>();
        if (JsonSerializer.Serialize(before.General) != JsonSerializer.Serialize(after.General))
            changed.Add("General");
        if (JsonSerializer.Serialize(before.Organization) != JsonSerializer.Serialize(after.Organization))
            changed.Add("Organization");
        if (JsonSerializer.Serialize(before.Operational) != JsonSerializer.Serialize(after.Operational))
            changed.Add("Operational");
        if (JsonSerializer.Serialize(before.Notification) != JsonSerializer.Serialize(after.Notification))
            changed.Add("Notification");
        return changed;
    }
}
