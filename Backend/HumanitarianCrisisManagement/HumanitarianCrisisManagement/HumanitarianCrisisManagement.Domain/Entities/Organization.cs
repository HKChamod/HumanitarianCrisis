namespace HumanitarianCrisisManagement.Domain.Entities;

public class Organization
{
    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public string OrganizationType { get; set; } = string.Empty;

    public string? RegistrationNumber { get; set; }

    public string? Description { get; set; }

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Role> Roles { get; set; }
        = new List<Role>();

    public ICollection<OrganizationMembership> Memberships { get; set; }
        = new List<OrganizationMembership>();
}
