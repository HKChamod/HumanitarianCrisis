namespace HumanitarianCrisisManagement.Domain.Entities;

public class ResponseTeam
{
    public int ResponseTeamId { get; set; }

    public int OrganizationId { get; set; }

    public string TeamName { get; set; } = string.Empty;

    public string TeamType { get; set; } = "General";

    public int? LeaderMembershipId { get; set; }

    public int? AreaId { get; set; }

    public string? BaseStation { get; set; }

    public string? ContactPhone { get; set; }

    public string? ContactEmail { get; set; }

    public string? SpecializedEquipment { get; set; }

    // Available, Deployed, Unavailable, Inactive
    public string Status { get; set; } = "Available";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Organization Organization { get; set; } = null!;

    public OrganizationMembership? LeaderMembership { get; set; }

    public Area? Area { get; set; }

    public ICollection<ResponseTeamMember> Members { get; set; }
        = new List<ResponseTeamMember>();

    public ICollection<ResponseTeamDeployment> Deployments { get; set; }
        = new List<ResponseTeamDeployment>();
}
