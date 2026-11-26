namespace HumanitarianCrisisManagement.Domain.Entities;

public class ResponseTeamDeployment
{
    public int DeploymentId { get; set; }

    public int ResponseTeamId { get; set; }

    public int OrganizationId { get; set; }

    public int? CrisisId { get; set; }

    public int? CitizenRequestId { get; set; }

    public int? AreaId { get; set; }

    public string MissionTitle { get; set; } = string.Empty;

    public string? Notes { get; set; }

    // Active, Completed, Cancelled
    public string Status { get; set; } = "Active";

    public DateTime DeployedAt { get; set; } = DateTime.UtcNow;

    public DateTime? CompletedAt { get; set; }

    public int? DeployedByUserId { get; set; }

    // Navigation properties
    public ResponseTeam ResponseTeam { get; set; } = null!;

    public Organization Organization { get; set; } = null!;

    public CrisisEvent? Crisis { get; set; }

    public CitizenRequest? CitizenRequest { get; set; }

    public Area? Area { get; set; }

    public User? DeployedByUser { get; set; }
}
