namespace HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

public class MyOrganizationAccessResponse
{
    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public int MembershipId { get; set; }

    public string MembershipStatus { get; set; } = string.Empty;

    public List<string> Roles { get; set; } = new();

    public List<string> Permissions { get; set; } = new();
}
