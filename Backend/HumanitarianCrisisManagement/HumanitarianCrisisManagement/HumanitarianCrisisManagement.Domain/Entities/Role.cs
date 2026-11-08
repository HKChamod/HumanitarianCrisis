namespace HumanitarianCrisisManagement.Domain.Entities;

public class Role
{
    public int RoleId { get; set; }

    public string RoleName { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Null = System-level role
    // Value = Organization-specific role
    public int? OrganizationId { get; set; }

    // Identifies roles managed by the system
    public bool IsSystemDefined { get; set; } = false;

    // Navigation properties
    public Organization? Organization { get; set; }

    public ICollection<UserRole> UserRoles { get; set; }
        = new List<UserRole>();


    public ICollection<OrganizationMembershipRole> MembershipRoles { get; set; }
        = new List<OrganizationMembershipRole>();

    public ICollection<RolePermission> RolePermissions { get; set; }
        = new List<RolePermission>();
}
