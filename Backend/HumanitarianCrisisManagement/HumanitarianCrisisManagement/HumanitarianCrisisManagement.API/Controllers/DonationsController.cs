using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.Donations;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DonationsController : ControllerBase
{
    private readonly IDonationService _donationService;

    public DonationsController(IDonationService donationService)
    {
        _donationService = donationService;
    }

    private int? TryGetCurrentUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(claim, out var userId) ? userId : null;
    }

    private int GetCurrentUserId() =>
        TryGetCurrentUserId() ?? throw new UnauthorizedAccessException("Invalid user identity.");

    [HttpGet]
    [Authorize(Policy = "Donations.View")]
    [ProducesResponseType(typeof(IReadOnlyList<DonationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? donationType = null,
        [FromQuery] string? status = null)
    {
        return Ok(await _donationService.GetAllAsync(donationType, status));
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "Donations.View")]
    [ProducesResponseType(typeof(DonationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(int id)
    {
        return Ok(await _donationService.GetByIdAsync(id));
    }

    [HttpPost]
    [Authorize(Policy = "Donations.Manage")]
    [ProducesResponseType(typeof(DonationResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateDonationRequest request)
    {
        var created = await _donationService.CreateAsync(request, TryGetCurrentUserId());
        return CreatedAtAction(nameof(GetById), new { id = created.DonationId }, created);
    }

    [HttpPatch("{id:int}/verify")]
    [Authorize(Policy = "Donations.Verify")]
    [ProducesResponseType(typeof(DonationResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Verify(int id, [FromBody] VerifyDonationRequest request)
    {
        return Ok(await _donationService.VerifyAsync(id, request, GetCurrentUserId()));
    }
}
