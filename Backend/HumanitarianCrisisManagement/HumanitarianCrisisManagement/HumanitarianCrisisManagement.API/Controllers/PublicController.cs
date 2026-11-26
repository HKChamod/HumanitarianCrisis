using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.API.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private const string GuestPortalEmail = "guest.portal@hcms.system.local";

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IPasswordHasherService _passwordHasher;

    public PublicController(
        ApplicationDbContext context,
        IAuditLogService auditLogService,
        IPasswordHasherService passwordHasher)
    {
        _context = context;
        _auditLogService = auditLogService;
        _passwordHasher = passwordHasher;
    }

    public class GuestAssistanceRequestInput
    {
        [Required]
        [StringLength(50)]
        public string Category { get; set; } = "Food";

        [Required]
        [StringLength(2000)]
        public string Description { get; set; } = string.Empty;

        [Range(1, 10000)]
        public int PeopleAffected { get; set; } = 1;

        [StringLength(30)]
        public string UrgencyLevel { get; set; } = "High";

        public int? AreaId { get; set; }
        public int? CrisisId { get; set; }
        public string? DistrictName { get; set; }
        public string? AddressLine { get; set; }
        public string? ContactName { get; set; }

        [Required]
        [StringLength(30)]
        public string ContactPhone { get; set; } = string.Empty;

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
    }

    public class TrackAssistanceRequestInput
    {
        [Required]
        public string ReferenceNumber { get; set; } = string.Empty;

        public string? VerificationPhone { get; set; }
    }

    [HttpGet("notices")]
    public async Task<IActionResult> GetNotices()
    {
        var crises = await _context.CrisisEvents
            .AsNoTracking()
            .Where(c => c.Status == "Active" || c.Status == "Reported")
            .OrderByDescending(c => c.StartDate)
            .Take(10)
            .Select(c => new
            {
                id = $"notice-{c.CrisisId}",
                title = c.CrisisName,
                message = c.Description ?? $"{c.CrisisType} alert in {c.LocationName ?? "affected area"}.",
                severity = c.SeverityLevel,
                category = c.CrisisType,
                publishedAt = c.StartDate
            })
            .ToListAsync();

        return Ok(new { data = crises });
    }

    [HttpPost("assistance-requests")]
    public async Task<IActionResult> SubmitGuestAssistanceRequest([FromBody] GuestAssistanceRequestInput input)
    {
        if (string.IsNullOrWhiteSpace(input.Category) ||
            string.IsNullOrWhiteSpace(input.Description) ||
            string.IsNullOrWhiteSpace(input.ContactPhone))
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation Failed",
                Detail = "Category, description, and contact phone are required."
            });
        }

        // Resolve AreaId from DB
        int areaId;
        if (input.AreaId.HasValue && await _context.Areas.AnyAsync(a => a.AreaId == input.AreaId.Value))
        {
            areaId = input.AreaId.Value;
        }
        else if (!string.IsNullOrWhiteSpace(input.DistrictName))
        {
            var area = await _context.Areas
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.AreaName.Contains(input.DistrictName.Trim()));
            if (area != null)
            {
                areaId = area.AreaId;
            }
            else
            {
                areaId = await _context.Areas
                    .AsNoTracking()
                    .OrderBy(a => a.AreaId)
                    .Select(a => a.AreaId)
                    .FirstOrDefaultAsync();
            }
        }
        else
        {
            areaId = await _context.Areas
                .AsNoTracking()
                .OrderBy(a => a.AreaId)
                .Select(a => a.AreaId)
                .FirstOrDefaultAsync();
        }

        if (areaId <= 0)
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Area Required",
                Detail = "No geographic area is configured in the system."
            });
        }

        // Reuse or create disabled guest portal system user for FK integrity
        var guestUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == GuestPortalEmail);
        if (guestUser == null)
        {
            guestUser = new User
            {
                FullName = "Public Guest Portal",
                Email = GuestPortalEmail,
                IsActive = false,
                CreatedAt = DateTime.UtcNow
            };
            guestUser.PasswordHash = _passwordHasher.HashPassword(guestUser, Guid.NewGuid().ToString("N") + "!Aa1");
            _context.Users.Add(guestUser);
            await _context.SaveChangesAsync();
        }

        var normalizedUrgency = input.UrgencyLevel?.Trim() switch
        {
            "Critical" => "Critical",
            "High" => "High",
            "Low" => "Low",
            _ => "Medium"
        };

        var cleanPhone = input.ContactPhone.Trim();
        var cleanName = string.IsNullOrWhiteSpace(input.ContactName) ? "Guest" : input.ContactName.Trim();
        var addressText = string.IsNullOrWhiteSpace(input.AddressLine)
            ? $"[Guest: {cleanName} | Phone: {cleanPhone}]"
            : $"{input.AddressLine.Trim()} [Guest: {cleanName} | Phone: {cleanPhone}]";
        if (addressText.Length > 500)
        {
            addressText = addressText[..500];
        }

        var entity = new CitizenRequest
        {
            UserId = guestUser.UserId,
            CrisisId = input.CrisisId,
            AreaId = areaId,
            RequestType = input.Category.Trim(),
            Description = input.Description.Trim(),
            UrgencyLevel = normalizedUrgency,
            PeopleCount = Math.Max(1, input.PeopleAffected),
            Status = "Pending",
            Address = addressText,
            Latitude = input.Latitude,
            Longitude = input.Longitude,
            CreatedAt = DateTime.UtcNow
        };

        _context.CitizenRequests.Add(entity);
        await _context.SaveChangesAsync();

        var referenceNumber = $"HCMS-2026-{entity.RequestId:D6}";
        await _auditLogService.RecordAsync(
            null,
            GuestPortalEmail,
            "PublicRequest.Submitted",
            "CitizenRequest",
            entity.RequestId.ToString(),
            $"Guest emergency assistance request {referenceNumber} ({entity.RequestType}) submitted.");

        return StatusCode(StatusCodes.Status201Created, new
        {
            data = new
            {
                id = entity.RequestId,
                requestId = entity.RequestId,
                referenceNumber,
                status = entity.Status,
                category = entity.RequestType,
                createdAt = entity.CreatedAt,
                contactPhone = cleanPhone
            }
        });
    }

    [HttpPost("assistance-requests/track")]
    public async Task<IActionResult> TrackAssistanceRequest([FromBody] TrackAssistanceRequestInput input)
    {
        if (string.IsNullOrWhiteSpace(input.ReferenceNumber))
        {
            return BadRequest(new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Reference Required",
                Detail = "Please enter a request reference number."
            });
        }

        var digitsMatch = Regex.Match(input.ReferenceNumber.Trim(), @"(\d+)$");
        if (!digitsMatch.Success || !int.TryParse(digitsMatch.Groups[1].Value, out var requestId))
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Request not found",
                Detail = "No assistance request was found with this reference number."
            });
        }

        var req = await _context.CitizenRequests
            .AsNoTracking()
            .Include(r => r.Area)
            .Include(r => r.User)
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (req == null)
        {
            return NotFound(new ProblemDetails
            {
                Status = StatusCodes.Status404NotFound,
                Title = "Request not found",
                Detail = "No assistance request was found with this reference number."
            });
        }

        var providedDigits = Regex.Replace(input.VerificationPhone ?? string.Empty, @"\D", "");
        var storedPhone = req.User.PhoneNumber ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(req.Address))
        {
            var phoneMatch = Regex.Match(req.Address, @"Phone:\s*([^\]]+)");
            if (phoneMatch.Success)
            {
                storedPhone = phoneMatch.Groups[1].Value.Trim();
            }
        }
        var storedDigits = Regex.Replace(storedPhone, @"\D", "");

        if (!string.IsNullOrEmpty(storedDigits) && !string.IsNullOrEmpty(providedDigits))
        {
            var last4 = providedDigits.Length >= 4 ? providedDigits[^4..] : providedDigits;
            if (!storedDigits.EndsWith(last4, StringComparison.Ordinal) &&
                !string.Equals(storedDigits, providedDigits, StringComparison.Ordinal))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Verification failed",
                    Detail = "The contact phone number provided does not match the record for this reference."
                });
            }
        }

        return Ok(new
        {
            data = new
            {
                id = req.RequestId,
                referenceNumber = $"HCMS-2026-{req.RequestId:D6}",
                category = req.RequestType,
                description = req.Description,
                peopleAffected = req.PeopleCount,
                status = req.Status,
                urgencyLevel = req.UrgencyLevel,
                createdAt = req.CreatedAt,
                updatedAt = req.UpdatedAt,
                location = new
                {
                    districtName = req.Area.AreaName,
                    addressLine = req.Address,
                    latitude = req.Latitude,
                    longitude = req.Longitude
                },
                timeline = new[]
                {
                    new
                    {
                        status = req.Status,
                        time = req.UpdatedAt ?? req.CreatedAt,
                        note = $"Current status in HCMS: {req.Status}"
                    }
                }
            }
        });
    }
}
