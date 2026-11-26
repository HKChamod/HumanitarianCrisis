namespace HumanitarianCrisisManagement.Application.DTOs.Organizations;

public class OrganizationResponse
{
    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public string OrganizationType { get; set; } = string.Empty;

    public string? RegistrationNumber { get; set; }

    public string? Description { get; set; }

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public string? Website { get; set; }

    public string? PrimaryContactName { get; set; }

    public string? EmergencyContactPhone { get; set; }

    public string PreferredLanguage { get; set; } = "en";

    public bool EmailAlertsEnabled { get; set; } = true;

    public bool CrisisAlertsEnabled { get; set; } = true;

    public bool RequestAlertsEnabled { get; set; } = true;

    public bool AutoAssignNotifications { get; set; } = true;

    public bool CompactTables { get; set; } = false;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public int MemberCount { get; set; }
}
