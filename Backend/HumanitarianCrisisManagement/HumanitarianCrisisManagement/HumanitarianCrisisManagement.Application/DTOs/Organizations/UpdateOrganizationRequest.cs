using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Organizations;

public class UpdateOrganizationRequest
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string OrganizationName { get; set; } = string.Empty;

    [Required]
    [StringLength(50, MinimumLength = 2)]
    public string OrganizationType { get; set; } = string.Empty;

    [StringLength(100)]
    public string? RegistrationNumber { get; set; }

    [StringLength(2000)]
    public string? Description { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }

    [Phone]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    [Range(-90, 90)]
    public decimal? Latitude { get; set; }

    [Range(-180, 180)]
    public decimal? Longitude { get; set; }

    [StringLength(300)]
    public string? Website { get; set; }

    [StringLength(150)]
    public string? PrimaryContactName { get; set; }

    [StringLength(30)]
    public string? EmergencyContactPhone { get; set; }

    [RegularExpression("^(en|si|ta)$", ErrorMessage = "PreferredLanguage must be 'en', 'si', or 'ta'.")]
    public string PreferredLanguage { get; set; } = "en";

    public bool EmailAlertsEnabled { get; set; } = true;

    public bool CrisisAlertsEnabled { get; set; } = true;

    public bool RequestAlertsEnabled { get; set; } = true;

    public bool AutoAssignNotifications { get; set; } = true;

    public bool CompactTables { get; set; } = false;

    public bool IsActive { get; set; } = true;
}
