using HumanitarianCrisisManagement.Application.DTOs.Resources;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IResourceService
{
    Task<ResourceResponse> CreateAsync(CreateResourceRequest request);

    Task<IReadOnlyList<ResourceResponse>> GetAllAsync();

    Task<ResourceResponse> GetByIdAsync(int id);

    Task<ResourceResponse> UpdateAsync(
        int id,
        UpdateResourceRequest request);

    Task DeleteAsync(int id);
}