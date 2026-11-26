using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

public class AddOrganizationMemberRequest
{
    public int? UserId { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? Email { get; set; }
}

public class CreateOrganizationRoleRequest
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string RoleName { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Description { get; set; }

    public List<int> PermissionIds { get; set; } = new();
}

public class OrganizationRolePermissionItem
{
    public int PermissionId { get; set; }
    public string PermissionName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class OrganizationRoleResponse
{
    public int RoleId { get; set; }
    public int OrganizationId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemDefined { get; set; }
    public List<OrganizationRolePermissionItem> Permissions { get; set; } = new();
}
