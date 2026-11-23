using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Users;

public class UserAdminResponse
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
    public List<string> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateUserAdminRequest
{
    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;
    [Required, MinLength(8), MaxLength(128)]
    public string Password { get; set; } = string.Empty;
    [MaxLength(40)]
    public string? PhoneNumber { get; set; }
    public List<int> RoleIds { get; set; } = new();
}

public class UpdateUserAdminRequest
{
    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [MaxLength(40)]
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateUserRolesRequest
{
    [Required]
    public List<int> RoleIds { get; set; } = new();
}

public class RoleDetailResponse
{
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int UserCount { get; set; }
    public List<PermissionItemResponse> Permissions { get; set; } = new();
}

public class PermissionItemResponse
{
    public int PermissionId { get; set; }
    public string PermissionName { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class UpdateRolePermissionsRequest
{
    [Required]
    public List<int> PermissionIds { get; set; } = new();
}
