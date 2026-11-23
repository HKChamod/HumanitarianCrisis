using System.Security.Claims;
using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AiRecommendationsController : ControllerBase
{
    private readonly IAiDecisionSupportService _aiService;

    public AiRecommendationsController(IAiDecisionSupportService aiService)
    {
        _aiService = aiService;
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user identity.");
        }

        return userId;
    }

    [HttpGet("status")]
    [Authorize(Policy = "AI.View")]
    [ProducesResponseType(typeof(AiProviderStatusResponse), StatusCodes.Status200OK)]
    public IActionResult GetStatus()
    {
        return Ok(_aiService.GetProviderStatus());
    }

    [HttpPost("diagnostic")]
    [Authorize(Policy = "AI.Review")]
    [ProducesResponseType(typeof(AiProviderDiagnosticResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> RunDiagnostic(CancellationToken cancellationToken)
    {
        var result = await _aiService.RunProviderDiagnosticAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    [Authorize(Policy = "AI.View")]
    [ProducesResponseType(typeof(IReadOnlyList<AiRecommendationResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? reviewStatus = null,
        [FromQuery] int? citizenRequestId = null)
    {
        var result = await _aiService.GetAllAsync(reviewStatus, citizenRequestId);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    [Authorize(Policy = "AI.View")]
    [ProducesResponseType(typeof(AiRecommendationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _aiService.GetByIdAsync(id);
        return Ok(result);
    }

    [HttpPost("analyze/{citizenRequestId:int}")]
    [Authorize(Policy = "AI.Review")]
    [ProducesResponseType(typeof(AiRecommendationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> AnalyzeCitizenRequest(
        int citizenRequestId,
        CancellationToken cancellationToken)
    {
        var result = await _aiService.AnalyzeCitizenRequestAsync(
            citizenRequestId,
            cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id = result.RecommendationId },
            result);
    }

    [HttpPatch("{id:int}/review")]
    [Authorize(Policy = "AI.Review")]
    [ProducesResponseType(typeof(AiRecommendationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Review(
        int id,
        [FromBody] ReviewAiRecommendationRequest request)
    {
        var reviewerUserId = GetCurrentUserId();
        var result = await _aiService.ReviewAsync(id, request, reviewerUserId);
        return Ok(result);
    }
}
