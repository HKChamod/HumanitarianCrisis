using HumanitarianCrisisManagement.Application.DTOs.Shelters;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IShelterService
{
    Task<IReadOnlyList<ShelterResponse>> GetAllAsync(int? areaId = null, string? status = null, bool activeOnly = false);
    Task<ShelterResponse> GetByIdAsync(int shelterId);
    Task<ShelterResponse> CreateAsync(CreateShelterRequest request, int actorUserId);
    Task<ShelterResponse> UpdateAsync(int shelterId, UpdateShelterRequest request, int actorUserId);
    Task<IReadOnlyList<ShelterPlacementResponse>> GetPlacementsAsync(int? shelterId = null, string? status = null);
    Task<ShelterPlacementResponse> CreatePlacementAsync(CreateShelterPlacementRequest request, int actorUserId);
    Task<ShelterPlacementResponse> CheckOutPlacementAsync(int placementId, int actorUserId);
}
