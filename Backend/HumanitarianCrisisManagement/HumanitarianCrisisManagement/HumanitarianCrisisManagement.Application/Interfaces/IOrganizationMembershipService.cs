using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IOrganizationMembershipService
{
    Task<OrganizationMembershipResponse> RequestMembershipAsync(
        int organizationId,
        int userId);

    Task<OrganizationMembershipResponse> AddMemberAsync(
        int organizationId,
        AddOrganizationMemberRequest request);

    Task<IReadOnlyList<OrganizationRoleResponse>> GetOrganizationRolesAsync(
        int organizationId);

    Task<OrganizationRoleResponse> CreateOrganizationRoleAsync(
        int organizationId,
        CreateOrganizationRoleRequest request,
        int createdByUserId);

    Task<IReadOnlyList<OrganizationMemberResponse>> GetMembersAsync(
        int organizationId);

    Task<OrganizationMembershipResponse> ApproveMembershipAsync(
        int organizationId,
        int membershipId,
        int approvedByUserId);

    Task<OrganizationMembershipResponse> RejectMembershipAsync(
        int organizationId,
        int membershipId);

    Task<OrganizationMemberResponse> AssignRolesAsync(
        int organizationId,
        int membershipId,
        AssignOrganizationRolesRequest request,
        int assignedByUserId);

    Task<IReadOnlyList<MyOrganizationMembershipResponse>> GetMyMembershipsAsync(
        int userId);

    Task<MyOrganizationAccessResponse?> GetMyOrganizationAccessAsync(
        int organizationId,
        int userId);
}