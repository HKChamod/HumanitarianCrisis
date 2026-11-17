namespace HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

public class OrganizationMembershipResponse
{
    public int MembershipId { get; set; }

    public int UserId { get; set; }

    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public string MembershipStatus { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public int? ApprovedByUserId { get; set; }
}