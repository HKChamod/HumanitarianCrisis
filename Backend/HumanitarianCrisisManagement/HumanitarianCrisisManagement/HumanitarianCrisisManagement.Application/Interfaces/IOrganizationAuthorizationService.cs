namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IOrganizationAuthorizationService
{
    Task<bool> HasActiveApprovedMembershipAsync(
        int userId,
        int organizationId);

    Task<bool> HasOrganizationPermissionAsync(
        int userId,
        int organizationId,
        string permissionName);
}
