using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

public class AssignOrganizationRolesRequest
{
    [Required]
    [MinLength(1)]
    public List<int> RoleIds { get; set; } = new();
}