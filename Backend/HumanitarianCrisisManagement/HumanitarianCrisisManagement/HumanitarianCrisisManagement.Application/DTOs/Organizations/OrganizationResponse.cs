namespace HumanitarianCrisisManagement.Application.DTOs.Organizations;

public class OrganizationResponse
{
    public int OrganizationId { get; set; }

    public string OrganizationName { get; set; } = string.Empty;

    public string OrganizationType { get; set; } = string.Empty;

    public string? RegistrationNumber { get; set; }

    public string? Description { get; set; }

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public int MemberCount { get; set; }
}
