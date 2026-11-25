using HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class CitizenRequestService : ICitizenRequestService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService? _auditLogService;
    private readonly INotificationService? _notificationService;

    public CitizenRequestService(
        ApplicationDbContext context,
        IAuditLogService? auditLogService = null,
        INotificationService? notificationService = null)
    {
        _context = context;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public async Task<CitizenRequestResponse> CreateAsync(
    CreateCitizenRequest request,
    int userId)
    {
        var userExists = await _context.Users
            .AnyAsync(u => u.UserId == userId && u.IsActive);

        if (!userExists)
            throw new InvalidOperationException("Active user not found.");

        var area = await _context.Areas
            .FirstOrDefaultAsync(a => a.AreaId == request.AreaId);

        if (area == null)
            throw new KeyNotFoundException("Area not found.");

        if (!area.IsActive)
            throw new InvalidOperationException("Cannot create a request for an inactive area.");

        if (request.CrisisId.HasValue)
        {
            var crisisExists = await _context.CrisisEvents
                .AnyAsync(c => c.CrisisId == request.CrisisId.Value);

            if (!crisisExists)
                throw new KeyNotFoundException("Crisis event not found.");
        }

        var citizenRequest = new CitizenRequest
        {
            UserId = userId,
            CrisisId = request.CrisisId,
            AreaId = request.AreaId,
            RequestType = request.RequestType.Trim(),
            Description = request.Description.Trim(),
            UrgencyLevel = request.UrgencyLevel.Trim(),
            PeopleCount = request.PeopleCount,
            Status = "Pending",
            Address = request.Address?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CreatedAt = DateTime.UtcNow
        };

        _context.CitizenRequests.Add(citizenRequest);

        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.RecordAsync(
                userId,
                null,
                "CitizenRequest.Created",
                "CitizenRequest",
                citizenRequest.RequestId.ToString(),
                $"Submitted citizen request #{citizenRequest.RequestId} ({citizenRequest.RequestType}, urgency {citizenRequest.UrgencyLevel}).");
        }

        if (_notificationService != null)
        {
            await _notificationService.CreateAsync(new Application.DTOs.Notifications.CreateNotificationRequest
            {
                UserId = userId,
                Title = $"Assistance Request #{citizenRequest.RequestId} Submitted",
                Message = $"Your {citizenRequest.RequestType} assistance request (REQ-{citizenRequest.RequestId}) has been registered and is pending coordinator verification.",
                Category = "CitizenRequest",
                Severity = "Info",
                RelatedEntityType = "CitizenRequest",
                RelatedEntityId = citizenRequest.RequestId
            });
        }

        return await GetByIdAsync(citizenRequest.RequestId);
    }

    public async Task<IReadOnlyList<CitizenRequestResponse>> GetMyRequestsAsync(
        int userId)
    {
        var requests = await _context.CitizenRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.CrisisEvent)
            .Include(r => r.Area)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests
            .Select(MapToResponse)
            .ToList();
    }

    public async Task<IReadOnlyList<CitizenRequestResponse>> GetAllAsync()
    {
        var requests = await _context.CitizenRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.CrisisEvent)
            .Include(r => r.Area)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests
            .Select(MapToResponse)
            .ToList();
    }

    public async Task<CitizenRequestResponse> GetByIdAsync(int id)
    {
        var request = await _context.CitizenRequests
            .AsNoTracking()
            .Include(r => r.User)
            .Include(r => r.CrisisEvent)
            .Include(r => r.Area)
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (request == null)
            throw new KeyNotFoundException("Citizen request not found.");

        return MapToResponse(request);
    }

    public async Task<CitizenRequestResponse> UpdateAsync(
        int id,
        int userId,
        UpdateCitizenRequest request)
    {
        var citizenRequest = await _context.CitizenRequests
            .FirstOrDefaultAsync(r =>
                r.RequestId == id && r.UserId == userId);

        if (citizenRequest == null)
            throw new KeyNotFoundException("Citizen request not found.");

        if (citizenRequest.Status != "Pending")
            throw new InvalidOperationException(
                "Only pending requests can be updated.");

        var area = await _context.Areas
            .FirstOrDefaultAsync(a => a.AreaId == request.AreaId);

        if (area == null)
            throw new KeyNotFoundException("Area not found.");

        if (!area.IsActive)
            throw new InvalidOperationException(
                "Cannot assign a request to an inactive area.");

        if (request.CrisisId.HasValue)
        {
            var crisisExists = await _context.CrisisEvents
                .AnyAsync(c => c.CrisisId == request.CrisisId.Value);

            if (!crisisExists)
                throw new KeyNotFoundException("Crisis event not found.");
        }

        citizenRequest.CrisisId = request.CrisisId;
        citizenRequest.AreaId = request.AreaId;
        citizenRequest.RequestType = request.RequestType.Trim();
        citizenRequest.Description = request.Description.Trim();
        citizenRequest.UrgencyLevel = request.UrgencyLevel.Trim();
        citizenRequest.PeopleCount = request.PeopleCount;
        citizenRequest.Address = request.Address?.Trim();
        citizenRequest.Latitude = request.Latitude;
        citizenRequest.Longitude = request.Longitude;
        citizenRequest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<CitizenRequestResponse> UpdateStatusAsync(
        int id,
        UpdateCitizenRequestStatus request)
    {
        var citizenRequest = await _context.CitizenRequests
            .FirstOrDefaultAsync(r => r.RequestId == id);

        if (citizenRequest == null)
            throw new KeyNotFoundException("Citizen request not found.");

        var allowedTransitions = new Dictionary<string, string[]>
    {
        { "Pending", new[] { "Verified", "Rejected" } },
        { "Verified", new[] { "Assigned", "Rejected" } },
        { "Assigned", new[] { "Fulfilled" } }
    };

        if (!allowedTransitions.TryGetValue(
                citizenRequest.Status, out var allowedStatuses)
            || !allowedStatuses.Contains(request.Status))
        {
            throw new InvalidOperationException(
                $"Cannot change request status from {citizenRequest.Status} to {request.Status}.");
        }

        var previousStatus = citizenRequest.Status;
        citizenRequest.Status = request.Status;
        citizenRequest.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (_auditLogService != null)
        {
            await _auditLogService.RecordAsync(
                null,
                null,
                "CitizenRequest.StatusUpdated",
                "CitizenRequest",
                citizenRequest.RequestId.ToString(),
                $"Updated citizen request #{citizenRequest.RequestId} status from {previousStatus} to {citizenRequest.Status}.");
        }

        if (_notificationService != null)
        {
            var severity = citizenRequest.Status switch
            {
                "Fulfilled" => "Success",
                "Rejected" => "Warning",
                _ => "Info"
            };

            await _notificationService.CreateAsync(new Application.DTOs.Notifications.CreateNotificationRequest
            {
                UserId = citizenRequest.UserId,
                Title = $"Request REQ-{citizenRequest.RequestId}: {citizenRequest.Status}",
                Message = $"Your {citizenRequest.RequestType} assistance request (REQ-{citizenRequest.RequestId}) status has changed from {previousStatus} to {citizenRequest.Status}.",
                Category = "CitizenRequest",
                Severity = severity,
                RelatedEntityType = "CitizenRequest",
                RelatedEntityId = citizenRequest.RequestId
            });
        }

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(int id, int userId)
    {
        var citizenRequest = await _context.CitizenRequests
            .FirstOrDefaultAsync(r =>
                r.RequestId == id && r.UserId == userId);

        if (citizenRequest == null)
            throw new KeyNotFoundException("Citizen request not found.");

        if (citizenRequest.Status != "Pending")
            throw new InvalidOperationException(
                "Only pending requests can be deleted.");

        _context.CitizenRequests.Remove(citizenRequest);

        await _context.SaveChangesAsync();
    }

    private static CitizenRequestResponse MapToResponse(
        CitizenRequest request)
    {
        return new CitizenRequestResponse
        {
            RequestId = request.RequestId,
            UserId = request.UserId,
            CitizenName = request.User.FullName,

            CrisisId = request.CrisisId,
            CrisisName = request.CrisisEvent?.CrisisName,

            AreaId = request.AreaId,
            AreaName = request.Area.AreaName,

            RequestType = request.RequestType,
            Description = request.Description,
            UrgencyLevel = request.UrgencyLevel,
            PeopleCount = request.PeopleCount,
            Status = request.Status,

            Address = request.Address,
            Latitude = request.Latitude,
            Longitude = request.Longitude,

            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt
        };
    }
}