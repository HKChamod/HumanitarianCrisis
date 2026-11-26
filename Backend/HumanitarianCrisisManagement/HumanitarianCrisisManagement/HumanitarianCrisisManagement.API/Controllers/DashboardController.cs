using HumanitarianCrisisManagement.Application.DTOs.Dashboard;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet("overview")]
    [Authorize(Policy = "Reports.View")]
    [ProducesResponseType(typeof(SystemDashboardResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSystemOverview()
    {
        return Ok(await _dashboardService.GetSystemOverviewAsync());
    }

    [HttpGet("organizations/{organizationId:int}")]
    [Authorize(Policy = "Organizations.View")]
    [ProducesResponseType(typeof(OrganizationDashboardResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrganizationOverview(int organizationId)
    {
        return Ok(await _dashboardService.GetOrganizationOverviewAsync(organizationId));
    }
}
