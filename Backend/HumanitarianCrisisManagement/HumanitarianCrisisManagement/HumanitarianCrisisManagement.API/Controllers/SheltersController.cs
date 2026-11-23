using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Shelters;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SheltersController : ControllerBase
{
    private readonly IShelterService _shelterService;

    public SheltersController(IShelterService shelterService)
    {
        _shelterService = shelterService;
    }

    private int GetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(claim, out var userId))
            throw new UnauthorizedAccessException("Invalid user identity.");
        return userId;
    }

    [HttpGet]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyList<ShelterResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? areaId = null,
        [FromQuery] string? status = null,
        [FromQuery] bool activeOnly = false)
    {
        var result = await _shelterService.GetAllAsync(areaId, status, activeOnly);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ShelterResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(int id)
    {
        return Ok(await _shelterService.GetByIdAsync(id));
    }

    [HttpPost]
    [Authorize(Policy = "Shelters.Manage")]
    [ProducesResponseType(typeof(ShelterResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateShelterRequest request)
    {
        var created = await _shelterService.CreateAsync(request, GetCurrentUserId());
        return CreatedAtAction(nameof(GetById), new { id = created.ShelterId }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "Shelters.Manage")]
    [ProducesResponseType(typeof(ShelterResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateShelterRequest request)
    {
        return Ok(await _shelterService.UpdateAsync(id, request, GetCurrentUserId()));
    }

    [HttpGet("placements")]
    [Authorize(Policy = "Shelters.View")]
    [ProducesResponseType(typeof(IReadOnlyList<ShelterPlacementResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPlacements(
        [FromQuery] int? shelterId = null,
        [FromQuery] string? status = null)
    {
        return Ok(await _shelterService.GetPlacementsAsync(shelterId, status));
    }

    [HttpPost("placements")]
    [Authorize(Policy = "Shelters.Manage")]
    [ProducesResponseType(typeof(ShelterPlacementResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreatePlacement([FromBody] CreateShelterPlacementRequest request)
    {
        var created = await _shelterService.CreatePlacementAsync(request, GetCurrentUserId());
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpPatch("placements/{placementId:int}/checkout")]
    [Authorize(Policy = "Shelters.Manage")]
    [ProducesResponseType(typeof(ShelterPlacementResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> CheckOutPlacement(int placementId)
    {
        return Ok(await _shelterService.CheckOutPlacementAsync(placementId, GetCurrentUserId()));
    }
}
