using HumanitarianCrisisManagement.Application.DTOs.CrisisEvents;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface ICrisisEventService
{
    Task<CrisisEventResponse> CreateAsync(
        CreateCrisisEventRequest request);

    Task<IReadOnlyList<CrisisEventResponse>> GetAllAsync();

    Task<CrisisEventResponse> GetByIdAsync(int id);

    Task<CrisisEventResponse> UpdateAsync(
        int id,
        UpdateCrisisEventRequest request);

    Task<CrisisEventResponse> UpdateStatusAsync(
        int id,
        UpdateCrisisStatusRequest request);

    Task DeleteAsync(int id);
}
