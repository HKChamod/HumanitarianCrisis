using System.Data;
using HumanitarianCrisisManagement.Application.DTOs.Shelters;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class ShelterService : IShelterService
{
    private static readonly string[] ValidStatuses = ["Open", "Full", "Closed", "Maintenance"];

    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationService _notificationService;

    public ShelterService(
        ApplicationDbContext context,
        IAuditLogService auditLogService,
        INotificationService notificationService)
    {
        _context = context;
        _auditLogService = auditLogService;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<ShelterResponse>> GetAllAsync(
        int? areaId = null,
        string? status = null,
        bool activeOnly = false)
    {
        var query = _context.Shelters
            .AsNoTracking()
            .Include(s => s.Area)
            .AsQueryable();

        if (activeOnly)
            query = query.Where(s => s.IsActive);

        if (areaId.HasValue)
            query = query.Where(s => s.AreaId == areaId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status.Trim());

        var items = await query
            .OrderBy(s => s.ShelterName)
            .ToListAsync();

        return items.Select(MapShelter).ToList();
    }

    public async Task<ShelterResponse> GetByIdAsync(int shelterId)
    {
        var shelter = await _context.Shelters
            .AsNoTracking()
            .Include(s => s.Area)
            .FirstOrDefaultAsync(s => s.ShelterId == shelterId);

        if (shelter == null)
            throw new KeyNotFoundException("Shelter not found.");

        return MapShelter(shelter);
    }

    public async Task<ShelterResponse> CreateAsync(CreateShelterRequest request, int actorUserId)
    {
        if (request.Capacity <= 0)
            throw new ArgumentException("Shelter capacity must be greater than zero.");

        if (request.CurrentOccupancy < 0 || request.CurrentOccupancy > request.Capacity)
            throw new ArgumentException("Current occupancy must be between 0 and shelter capacity.");

        var normalizedStatus = NormalizeStatus(request.Status, request.CurrentOccupancy, request.Capacity);

        var areaExists = await _context.Areas.AnyAsync(a => a.AreaId == request.AreaId);
        if (!areaExists)
            throw new KeyNotFoundException("Selected area not found.");

        var shelter = new Shelter
        {
            ShelterName = request.ShelterName.Trim(),
            AreaId = request.AreaId,
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            Capacity = request.Capacity,
            CurrentOccupancy = request.CurrentOccupancy,
            Status = normalizedStatus,
            ContactName = request.ContactName?.Trim(),
            ContactPhone = request.ContactPhone?.Trim(),
            Facilities = request.Facilities?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Shelters.Add(shelter);
        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Shelter.Created",
            "Shelter",
            shelter.ShelterId.ToString(),
            $"Registered shelter '{shelter.ShelterName}' with capacity {shelter.Capacity}.");

        return await GetByIdAsync(shelter.ShelterId);
    }

    public async Task<ShelterResponse> UpdateAsync(int shelterId, UpdateShelterRequest request, int actorUserId)
    {
        if (request.Capacity <= 0)
            throw new ArgumentException("Shelter capacity must be greater than zero.");

        if (request.CurrentOccupancy < 0 || request.CurrentOccupancy > request.Capacity)
            throw new ArgumentException("Current occupancy cannot exceed shelter capacity.");

        var shelter = await _context.Shelters.FirstOrDefaultAsync(s => s.ShelterId == shelterId);
        if (shelter == null)
            throw new KeyNotFoundException("Shelter not found.");

        var areaExists = await _context.Areas.AnyAsync(a => a.AreaId == request.AreaId);
        if (!areaExists)
            throw new KeyNotFoundException("Selected area not found.");

        shelter.ShelterName = request.ShelterName.Trim();
        shelter.AreaId = request.AreaId;
        shelter.Address = request.Address.Trim();
        shelter.Latitude = request.Latitude;
        shelter.Longitude = request.Longitude;
        shelter.Capacity = request.Capacity;
        shelter.CurrentOccupancy = request.CurrentOccupancy;
        shelter.Status = NormalizeStatus(request.Status, request.CurrentOccupancy, request.Capacity);
        shelter.ContactName = request.ContactName?.Trim();
        shelter.ContactPhone = request.ContactPhone?.Trim();
        shelter.Facilities = request.Facilities?.Trim();
        shelter.IsActive = request.IsActive;
        shelter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Shelter.Updated",
            "Shelter",
            shelter.ShelterId.ToString(),
            $"Updated shelter '{shelter.ShelterName}' (occupancy {shelter.CurrentOccupancy}/{shelter.Capacity}, status {shelter.Status}).");

        return await GetByIdAsync(shelter.ShelterId);
    }

    public async Task<IReadOnlyList<ShelterPlacementResponse>> GetPlacementsAsync(
        int? shelterId = null,
        string? status = null)
    {
        var query = _context.ShelterPlacements
            .AsNoTracking()
            .Include(p => p.Shelter)
            .Include(p => p.AssignedByUser)
            .AsQueryable();

        if (shelterId.HasValue)
            query = query.Where(p => p.ShelterId == shelterId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status.Trim());

        var items = await query
            .OrderByDescending(p => p.CheckedInAt)
            .ToListAsync();

        return items.Select(MapPlacement).ToList();
    }

    public async Task<ShelterPlacementResponse> CreatePlacementAsync(
        CreateShelterPlacementRequest request,
        int actorUserId)
    {
        if (request.PeopleCount <= 0)
            throw new ArgumentException("People count must be greater than zero.");

        await using var tx = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var shelter = await _context.Shelters.FirstOrDefaultAsync(s => s.ShelterId == request.ShelterId);
        if (shelter == null)
            throw new KeyNotFoundException("Shelter not found.");

        if (!shelter.IsActive || string.Equals(shelter.Status, "Closed", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(shelter.Status, "Maintenance", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Shelter '{shelter.ShelterName}' is not open for placements.");
        }

        if (shelter.CurrentOccupancy + request.PeopleCount > shelter.Capacity)
        {
            throw new InvalidOperationException(
                $"Insufficient shelter capacity. Available capacity is {shelter.Capacity - shelter.CurrentOccupancy}.");
        }

        if (request.CitizenRequestId.HasValue)
        {
            var reqExists = await _context.CitizenRequests.AnyAsync(r => r.RequestId == request.CitizenRequestId.Value);
            if (!reqExists)
                throw new KeyNotFoundException("Linked citizen request not found.");
        }

        shelter.CurrentOccupancy += request.PeopleCount;
        if (shelter.CurrentOccupancy >= shelter.Capacity)
            shelter.Status = "Full";
        shelter.UpdatedAt = DateTime.UtcNow;

        var placement = new ShelterPlacement
        {
            ShelterId = shelter.ShelterId,
            CitizenRequestId = request.CitizenRequestId,
            ResidentName = request.ResidentName.Trim(),
            PeopleCount = request.PeopleCount,
            Status = "Active",
            Notes = request.Notes?.Trim(),
            AssignedByUserId = actorUserId,
            CheckedInAt = DateTime.UtcNow
        };

        _context.ShelterPlacements.Add(placement);
        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Shelter.PlacementCheckedIn",
            "ShelterPlacement",
            placement.PlacementId.ToString(),
            $"Checked in {placement.PeopleCount} resident(s) to shelter #{shelter.ShelterId} ({shelter.CurrentOccupancy}/{shelter.Capacity}).");

        if (shelter.Status == "Full")
        {
            await _notificationService.NotifyUsersByRoleAsync(
                "Administrator",
                $"Shelter Full: {shelter.ShelterName}",
                $"Shelter '{shelter.ShelterName}' has reached full capacity ({shelter.CurrentOccupancy}/{shelter.Capacity}).",
                "Shelter",
                "Warning",
                "Shelter",
                shelter.ShelterId);
        }

        var loaded = await _context.ShelterPlacements
            .AsNoTracking()
            .Include(p => p.Shelter)
            .Include(p => p.AssignedByUser)
            .FirstAsync(p => p.PlacementId == placement.PlacementId);

        return MapPlacement(loaded);
    }

    public async Task<ShelterPlacementResponse> CheckOutPlacementAsync(int placementId, int actorUserId)
    {
        await using var tx = await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable);

        var placement = await _context.ShelterPlacements
            .Include(p => p.Shelter)
            .Include(p => p.AssignedByUser)
            .FirstOrDefaultAsync(p => p.PlacementId == placementId);

        if (placement == null)
            throw new KeyNotFoundException("Shelter placement not found.");

        if (!string.Equals(placement.Status, "Active", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Only active shelter placements can be checked out.");

        placement.Status = "CheckedOut";
        placement.CheckedOutAt = DateTime.UtcNow;

        placement.Shelter.CurrentOccupancy = Math.Max(0, placement.Shelter.CurrentOccupancy - placement.PeopleCount);
        if (placement.Shelter.Status == "Full" && placement.Shelter.CurrentOccupancy < placement.Shelter.Capacity)
            placement.Shelter.Status = "Open";
        placement.Shelter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await tx.CommitAsync();

        await _auditLogService.RecordAsync(
            actorUserId,
            null,
            "Shelter.PlacementCheckedOut",
            "ShelterPlacement",
            placement.PlacementId.ToString(),
            $"Checked out placement #{placement.PlacementId} ({placement.PeopleCount} resident(s)) from shelter #{placement.ShelterId}.");

        return MapPlacement(placement);
    }

    private static string NormalizeStatus(string? requested, int occupancy, int capacity)
    {
        var status = string.IsNullOrWhiteSpace(requested) ? "Open" : requested.Trim();
        if (!ValidStatuses.Contains(status, StringComparer.OrdinalIgnoreCase))
            throw new ArgumentException($"Invalid shelter status '{status}'. Allowed: Open, Full, Closed, Maintenance.");

        var canonical = ValidStatuses.First(s => s.Equals(status, StringComparison.OrdinalIgnoreCase));
        if (canonical == "Open" && occupancy >= capacity)
            return "Full";
        return canonical;
    }

    private static ShelterResponse MapShelter(Shelter s) => new()
    {
        ShelterId = s.ShelterId,
        ShelterName = s.ShelterName,
        AreaId = s.AreaId,
        AreaName = s.Area.AreaName,
        Address = s.Address,
        Latitude = s.Latitude,
        Longitude = s.Longitude,
        Capacity = s.Capacity,
        CurrentOccupancy = s.CurrentOccupancy,
        Status = s.Status,
        ContactName = s.ContactName,
        ContactPhone = s.ContactPhone,
        Facilities = s.Facilities,
        IsActive = s.IsActive,
        CreatedAt = s.CreatedAt,
        UpdatedAt = s.UpdatedAt
    };

    private static ShelterPlacementResponse MapPlacement(ShelterPlacement p) => new()
    {
        PlacementId = p.PlacementId,
        ShelterId = p.ShelterId,
        ShelterName = p.Shelter.ShelterName,
        CitizenRequestId = p.CitizenRequestId,
        ResidentName = p.ResidentName,
        PeopleCount = p.PeopleCount,
        Status = p.Status,
        Notes = p.Notes,
        AssignedByUserId = p.AssignedByUserId,
        AssignedByUserName = p.AssignedByUser?.FullName,
        CheckedInAt = p.CheckedInAt,
        CheckedOutAt = p.CheckedOutAt
    };
}
