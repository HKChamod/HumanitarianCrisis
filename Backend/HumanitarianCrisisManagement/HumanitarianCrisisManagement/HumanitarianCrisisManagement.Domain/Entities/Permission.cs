namespace HumanitarianCrisisManagement.Domain.Entities;

public class Permission
{
    public int PermissionId { get; set; }

    public string PermissionName { get; set; } = string.Empty;

    public string? Description { get; set; }

    // Navigation property
    public ICollection<RolePermission> RolePermissions { get; set; }
        = new List<RolePermission>();
}
