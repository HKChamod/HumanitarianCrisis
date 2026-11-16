namespace HumanitarianCrisisManagement.Domain.Entities;

public class OrganizationMembershipRole
{
    public int MembershipRoleId { get; set; }

    public int MembershipId { get; set; }

    public int RoleId { get; set; }

    public int OrganizationId { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public int? AssignedByUserId { get; set; }

    // Navigation properties
    public OrganizationMembership Membership { get; set; } = null!;

    public Role Role { get; set; } = null!;

    public User? AssignedByUser { get; set; }
}
