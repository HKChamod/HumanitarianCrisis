namespace HumanitarianCrisisManagement.Domain.Entities;

public class ResponseTeamMember
{
    public int ResponseTeamMemberId { get; set; }

    public int ResponseTeamId { get; set; }

    public int MembershipId { get; set; }

    public string RoleInTeam { get; set; } = "Member";

    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ResponseTeam ResponseTeam { get; set; } = null!;

    public OrganizationMembership Membership { get; set; } = null!;
}
