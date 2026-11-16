
using HumanitarianCrisisManagement.Application.DTOs.CrisisEvents;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class CrisisEventService : ICrisisEventService
{
    private readonly ApplicationDbContext _context;

    public CrisisEventService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CrisisEventResponse> CreateAsync(
        CreateCrisisEventRequest request)
    {
        var crisis = new CrisisEvent
        {
            CrisisName = request.CrisisName.Trim(),
            CrisisType = request.CrisisType.Trim(),
            Description = request.Description.Trim(),
            SeverityLevel = request.SeverityLevel.Trim(),
            StartDate = request.StartDate,
            Status = "Active"
        };

        _context.CrisisEvents.Add(crisis);
        await _context.SaveChangesAsync();

        return MapToResponse(crisis);
    }

    public async Task<IReadOnlyList<CrisisEventResponse>> GetAllAsync()
    {
        var crises = await _context.CrisisEvents
            .AsNoTracking()
            .OrderByDescending(c => c.StartDate)
            .ToListAsync();

        return crises.Select(MapToResponse).ToList();
    }

    public async Task<CrisisEventResponse> GetByIdAsync(int id)
    {
        var crisis = await _context.CrisisEvents
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.CrisisId == id);

        if (crisis == null)
            throw new KeyNotFoundException("Crisis event not found.");

        return MapToResponse(crisis);
    }

    public async Task<CrisisEventResponse> UpdateAsync(
        int id,
        UpdateCrisisEventRequest request)
    {
        var crisis = await _context.CrisisEvents
            .FirstOrDefaultAsync(c => c.CrisisId == id);

        if (crisis == null)
            throw new KeyNotFoundException("Crisis event not found.");

        crisis.CrisisName = request.CrisisName.Trim();
        crisis.CrisisType = request.CrisisType.Trim();
        crisis.Description = request.Description.Trim();
        crisis.SeverityLevel = request.SeverityLevel.Trim();
        crisis.StartDate = request.StartDate;

        await _context.SaveChangesAsync();

        return MapToResponse(crisis);
    }

    public async Task<CrisisEventResponse> UpdateStatusAsync(
        int id,
        UpdateCrisisStatusRequest request)
    {
        var crisis = await _context.CrisisEvents
            .FirstOrDefaultAsync(c => c.CrisisId == id);

        if (crisis == null)
            throw new KeyNotFoundException("Crisis event not found.");

        crisis.Status = request.Status;

        await _context.SaveChangesAsync();

        return MapToResponse(crisis);
    }

    public async Task DeleteAsync(int id)
    {
        var crisis = await _context.CrisisEvents
            .FirstOrDefaultAsync(c => c.CrisisId == id);

        if (crisis == null)
            throw new KeyNotFoundException("Crisis event not found.");

        _context.CrisisEvents.Remove(crisis);
        await _context.SaveChangesAsync();
    }

    private static CrisisEventResponse MapToResponse(CrisisEvent crisis)
    {
        return new CrisisEventResponse
        {
            CrisisId = crisis.CrisisId,
            CrisisName = crisis.CrisisName,
            CrisisType = crisis.CrisisType,
            Description = crisis.Description,
            SeverityLevel = crisis.SeverityLevel,
            StartDate = crisis.StartDate,
            Status = crisis.Status
        };
    }
}
