using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.SystemSettings;

public class GeneralSettingsDto
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string SystemDisplayName { get; set; } = "HCMS Central Administration Portal — Sri Lanka";

    [StringLength(500)]
    public string ApplicationDescription { get; set; } =
        "Humanitarian Crisis Management and Aid Coordination Platform";

    [Required]
    [StringLength(64, MinimumLength = 2)]
    public string DefaultTimezone { get; set; } = "Asia/Colombo";

    [Required]
    [RegularExpression("^(en|si|ta)$", ErrorMessage = "DefaultLanguage must be en, si, or ta.")]
    public string DefaultLanguage { get; set; } = "en";

    [Required]
    [StringLength(32, MinimumLength = 4)]
    public string DateFormat { get; set; } = "yyyy-MM-dd";

    [Required]
    [RegularExpression("^(12h|24h)$", ErrorMessage = "TimeFormat must be 12h or 24h.")]
    public string TimeFormat { get; set; } = "24h";

    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string DefaultCountry { get; set; } = "Sri Lanka";

    [Required]
    [StringLength(10, MinimumLength = 3)]
    public string DefaultCurrency { get; set; } = "LKR";

    [EmailAddress]
    [StringLength(200)]
    public string ContactEmail { get; set; } = "coordination@hcms.gov.lk";

    [StringLength(30)]
    public string ContactPhone { get; set; } = "117";
}

public class OrganizationSettingsDto
{
    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string DefaultOrganizationType { get; set; } = "NGO";

    public bool AllowOrganizationRegistration { get; set; } = true;

    public bool RequireMembershipApproval { get; set; } = true;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string DefaultMembershipRoleName { get; set; } = "FieldCoordinator";
}

public class OperationalSettingsDto
{
    public bool AllowCitizenRequestSubmission { get; set; } = true;

    [Required]
    [RegularExpression("^(Low|Medium|High|Critical)$", ErrorMessage = "DefaultRequestPriority must be Low, Medium, High, or Critical.")]
    public string DefaultRequestPriority { get; set; } = "Medium";

    public bool RequireRequestReviewBeforeAllocation { get; set; } = true;

    [Range(1, 100000)]
    public int DefaultAllocationBatchLimit { get; set; } = 500;

    [Range(50, 100)]
    public int DefaultShelterCapacityAlertPercent { get; set; } = 85;

    public bool RequireVolunteerApprovalBeforeAssignment { get; set; } = true;
}

public class NotificationSettingsDto
{
    public bool SystemNotificationsEnabled { get; set; } = true;

    public bool EnableCrisisAlerts { get; set; } = true;

    public bool EnableRequestAlerts { get; set; } = true;

    public bool EnableLowStockAlerts { get; set; } = true;

    public bool EnableShelterAlerts { get; set; } = true;

    [Range(7, 3650)]
    public int NotificationRetentionDays { get; set; } = 90;
}

public class SystemSettingsResponse
{
    public GeneralSettingsDto General { get; set; } = new();
    public OrganizationSettingsDto Organization { get; set; } = new();
    public OperationalSettingsDto Operational { get; set; } = new();
    public NotificationSettingsDto Notification { get; set; } = new();
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedByEmail { get; set; }
    public string PersistenceMode { get; set; } = "ServerFilePendingMigration";
}

public class UpdateSystemSettingsRequest
{
    [Required]
    public GeneralSettingsDto General { get; set; } = new();

    [Required]
    public OrganizationSettingsDto Organization { get; set; } = new();

    [Required]
    public OperationalSettingsDto Operational { get; set; } = new();

    [Required]
    public NotificationSettingsDto Notification { get; set; } = new();
}

public class ModuleHealthItemDto
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "Healthy";
    public string Detail { get; set; } = string.Empty;
}

public class SystemInformationResponse
{
    public string ApplicationName { get; set; } = "Humanitarian Crisis Management System (HCMS)";
    public string BackendVersion { get; set; } = string.Empty;
    public string DotNetRuntimeVersion { get; set; } = string.Empty;
    public string EnvironmentName { get; set; } = string.Empty;
    public DateTime ServerUtcTime { get; set; }
    public string DatabaseProvider { get; set; } = string.Empty;
    public string DatabaseStatus { get; set; } = "Unavailable";
    public string OverallStatus { get; set; } = "Degraded";
    public bool HttpsEnabled { get; set; }
    public string AuthenticationMethod { get; set; } = "JWT Bearer (RBAC + Organization-Scoped Permissions)";
    public bool JwtConfigured { get; set; }
    public int JwtAccessTokenExpirationMinutes { get; set; }
    public string PersistenceMode { get; set; } = "ServerFilePendingMigration";
    public List<ModuleHealthItemDto> Modules { get; set; } = new();
}

public class SafeAiConfigurationResponse
{
    public string ConfiguredProvider { get; set; } = "None";
    public string ActiveProvider { get; set; } = "None";
    public List<string> AvailableProviders { get; set; } = ["None", "Groq", "Gemini"];
    public bool IsConfigured { get; set; }
    public string Status { get; set; } = "Not configured";
    public string Message { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public int TimeoutSeconds { get; set; }
    public bool IncludeSanitizedDescriptions { get; set; }
    public bool HumanApprovalRequired { get; set; } = true;
    public bool GeminiKeyConfigured { get; set; }
    public bool GroqKeyConfigured { get; set; }
    public string SetupInstructions { get; set; } = string.Empty;
}
