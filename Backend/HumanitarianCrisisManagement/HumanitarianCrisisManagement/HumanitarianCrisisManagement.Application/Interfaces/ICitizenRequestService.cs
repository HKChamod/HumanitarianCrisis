using HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface ICitizenRequestService
{
    Task<CitizenRequestResponse> CreateAsync(
        CreateCitizenRequest request,
        int userId);

    Task<IReadOnlyList<CitizenRequestResponse>> GetMyRequestsAsync(
        int userId);

    Task<IReadOnlyList<CitizenRequestResponse>> GetAllAsync();

    Task<CitizenRequestResponse> GetByIdAsync(int id);

    Task<CitizenRequestResponse> UpdateAsync(
        int id,
        int userId,
        UpdateCitizenRequest request);

    Task<CitizenRequestResponse> UpdateStatusAsync(
        int id,
        UpdateCitizenRequestStatus request);

    Task DeleteAsync(int id, int userId);
}