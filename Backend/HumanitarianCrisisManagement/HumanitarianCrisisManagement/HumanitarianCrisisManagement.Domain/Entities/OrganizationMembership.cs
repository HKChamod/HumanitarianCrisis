namespace HumanitarianCrisisManagement.Domain.Entities;

public class OrganizationMembership
{
    public int MembershipId { get; set; }

    public int UserId { get; set; }

    public int OrganizationId { get; set; }

    public string MembershipStatus { get; set; } = "Pending";

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ApprovedAt { get; set; }

    public int? ApprovedByUserId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;

    public Organization Organization { get; set; } = null!;

    public User? ApprovedByUser { get; set; }

    public ICollection<OrganizationMembershipRole> MembershipRoles { get; set; }
        = new List<OrganizationMembershipRole>();
}
