namespace HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

public class MyOrganizationMembershipResponse
{
    public int MembershipId { get; set; }

    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public string? RegistrationNumber { get; set; }

    public bool IsOrganizationActive { get; set; }

    public string MembershipStatus { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public List<string> Roles { get; set; } = new();
}
