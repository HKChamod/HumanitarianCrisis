using HumanitarianCrisisManagement.Application.DTOs.Organizations;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IOrganizationService
{
    Task<OrganizationResponse> CreateAsync(CreateOrganizationRequest request);

    Task<IReadOnlyList<OrganizationResponse>> GetAllAsync();

    Task<OrganizationResponse> GetByIdAsync(int id);

    Task<OrganizationResponse> UpdateAsync(int id, UpdateOrganizationRequest request);

    Task DeleteAsync(int id);
}
