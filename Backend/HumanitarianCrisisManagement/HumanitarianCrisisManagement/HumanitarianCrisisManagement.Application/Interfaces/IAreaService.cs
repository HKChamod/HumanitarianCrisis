
using HumanitarianCrisisManagement.Application.DTOs.Areas;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IAreaService
{
    Task<AreaResponse> CreateAsync(CreateAreaRequest request);

    Task<IReadOnlyList<AreaResponse>> GetAllAsync();

    Task<AreaResponse> GetByIdAsync(int id);

    Task<IReadOnlyList<AreaHierarchyResponse>> GetHierarchyAsync();

    Task<AreaResponse> UpdateAsync(int id, UpdateAreaRequest request);

    Task DeleteAsync(int id);
}
