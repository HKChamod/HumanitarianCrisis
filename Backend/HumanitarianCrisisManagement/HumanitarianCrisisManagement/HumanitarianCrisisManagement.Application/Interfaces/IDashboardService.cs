using HumanitarianCrisisManagement.Application.DTOs.Dashboard;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IDashboardService
{
    Task<SystemDashboardResponse> GetSystemOverviewAsync();
    Task<OrganizationDashboardResponse> GetOrganizationOverviewAsync(int organizationId);
}
