using HumanitarianCrisisManagement.Application.DTOs.OrganizationMemberships;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IOrganizationMembershipService
{
    Task<OrganizationMembershipResponse> RequestMembershipAsync(
        int organizationId,
        int userId);

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
}