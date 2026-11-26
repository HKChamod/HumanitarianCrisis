using HumanitarianCrisisManagement.Application.DTOs.Volunteers;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IVolunteerService
{
    Task<IReadOnlyList<VolunteerResponse>> GetAllAsync(string? availabilityStatus = null, string? approvalStatus = null);
    Task<VolunteerResponse> GetByIdAsync(int volunteerId);
    Task<VolunteerResponse> RegisterAsync(CreateVolunteerRequest request, int? actorUserId);
    Task<VolunteerResponse> UpdateAsync(int volunteerId, UpdateVolunteerRequest request, int actorUserId);
    Task<VolunteerResponse> UpdateApprovalAsync(int volunteerId, UpdateVolunteerApprovalRequest request, int actorUserId);
    Task<IReadOnlyList<VolunteerAssignmentResponse>> GetAssignmentsAsync(int? volunteerId = null, int? crisisId = null);
    Task<VolunteerAssignmentResponse> CreateAssignmentAsync(CreateVolunteerAssignmentRequest request, int actorUserId);
    Task<VolunteerAssignmentResponse> UpdateAssignmentStatusAsync(int assignmentId, UpdateVolunteerAssignmentStatusRequest request, int actorUserId);
}
