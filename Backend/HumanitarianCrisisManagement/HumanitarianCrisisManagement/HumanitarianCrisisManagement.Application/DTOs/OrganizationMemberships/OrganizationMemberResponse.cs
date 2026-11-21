namespace HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

public class OrganizationMemberResponse
{
    public int MembershipId { get; set; }

    public int UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string MembershipStatus { get; set; } = string.Empty;

    public DateTime JoinedAt { get; set; }

    public DateTime? ApprovedAt { get; set; }

    public int? ApprovedByUserId { get; set; }

    public List<string> Roles { get; set; } = new();
}