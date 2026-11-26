using HumanitarianCrisisManagement.Application.DTOs.Organizations;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IOrganizationWorkspaceService
{
    Task<OrganizationDashboardResponse> GetDashboardAsync(int organizationId);

    Task<IReadOnlyList<ResponseTeamDto>> GetTeamsAsync(int organizationId);
    Task<ResponseTeamDto> GetTeamByIdAsync(int organizationId, int teamId);
    Task<ResponseTeamDto> CreateTeamAsync(int organizationId, CreateResponseTeamRequest request, int actorUserId);
    Task<ResponseTeamDto> UpdateTeamAsync(int organizationId, int teamId, UpdateResponseTeamRequest request, int actorUserId);
    Task<ResponseTeamDto> UpdateTeamStatusAsync(int organizationId, int teamId, string status, int actorUserId);
    Task<ResponseTeamDto> AddTeamMemberAsync(int organizationId, int teamId, AddResponseTeamMemberRequest request, int actorUserId);
    Task<ResponseTeamDto> RemoveTeamMemberAsync(int organizationId, int teamId, int membershipId, int actorUserId);
    Task<ResponseTeamDeploymentDto> DeployTeamAsync(int organizationId, int teamId, CreateTeamDeploymentRequest request, int actorUserId);
    Task<ResponseTeamDeploymentDto> CompleteDeploymentAsync(int organizationId, int teamId, int deploymentId, string status, int actorUserId);

    Task<IReadOnlyList<OrganizationAreaDto>> GetAssignedAreasAsync(int organizationId);
    Task<OrganizationAreaDto> AssignAreaAsync(int organizationId, AssignOrganizationAreaRequest request, int actorUserId);
    Task<OrganizationAreaDto> UpdateAssignedAreaAsync(int organizationId, int organizationAreaId, UpdateOrganizationAreaRequest request, int actorUserId);
    Task RemoveAssignedAreaAsync(int organizationId, int organizationAreaId, int actorUserId);

    Task<IReadOnlyList<OrganizationAidRequestDto>> GetAidRequestsAsync(int organizationId);
    Task<OrganizationAidRequestDto> UpdateAidRequestStatusAsync(int organizationId, int requestId, string status, int actorUserId);
    Task<OrganizationAidRequestDto> AssignTeamToAidRequestAsync(int organizationId, int requestId, AssignTeamToAidRequestInput request, int actorUserId);

    Task<OrganizationLogisticsResponse> GetLogisticsAsync(int organizationId);
}
