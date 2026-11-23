using HumanitarianCrisisManagement.Application.DTOs.Users;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IUserManagementService
{
    Task<IReadOnlyList<UserAdminResponse>> GetAllAsync(string? search = null, bool? isActive = null);
    Task<UserAdminResponse> GetByIdAsync(int userId);
    Task<UserAdminResponse> CreateAsync(CreateUserAdminRequest request, int actorUserId);
    Task<UserAdminResponse> UpdateAsync(int userId, UpdateUserAdminRequest request, int actorUserId);
    Task<UserAdminResponse> SetActiveStatusAsync(int userId, bool isActive, int actorUserId);
    Task<UserAdminResponse> UpdateRolesAsync(int userId, UpdateUserRolesRequest request, int actorUserId);
}

public interface IRoleManagementService
{
    Task<IReadOnlyList<RoleDetailResponse>> GetAllRolesAsync();
    Task<IReadOnlyList<PermissionItemResponse>> GetAllPermissionsAsync();
    Task<RoleDetailResponse> UpdateRolePermissionsAsync(int roleId, UpdateRolePermissionsRequest request, int actorUserId);
}
