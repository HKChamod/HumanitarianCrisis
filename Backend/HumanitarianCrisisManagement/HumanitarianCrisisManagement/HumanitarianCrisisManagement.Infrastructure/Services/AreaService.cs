
using HumanitarianCrisisManagement.Application.DTOs.Areas;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class AreaService : IAreaService
{
    private readonly ApplicationDbContext _context;

    public AreaService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AreaResponse> CreateAsync(CreateAreaRequest request)
    {
        await ValidateParentAsync(request.ParentAreaId, null);
        await ValidateCodeAsync(request.Code, null);

        var area = new Area
        {
            AreaName = request.AreaName.Trim(),
            AreaType = request.AreaType.Trim(),
            ParentAreaId = request.ParentAreaId,
            Code = NormalizeCode(request.Code),
            IsActive = true
        };

        _context.Areas.Add(area);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(area.AreaId);
    }

    public async Task<IReadOnlyList<AreaResponse>> GetAllAsync()
    {
        return await _context.Areas
            .AsNoTracking()
            .OrderBy(a => a.AreaName)
            .Select(a => new AreaResponse
            {
                AreaId = a.AreaId,
                AreaName = a.AreaName,
                AreaType = a.AreaType,
                ParentAreaId = a.ParentAreaId,
                ParentAreaName = a.ParentArea != null
                    ? a.ParentArea.AreaName
                    : null,
                Code = a.Code,
                IsActive = a.IsActive
            })
            .ToListAsync();
    }

    public async Task<AreaResponse> GetByIdAsync(int id)
    {
        var area = await _context.Areas
            .AsNoTracking()
            .Where(a => a.AreaId == id)
            .Select(a => new AreaResponse
            {
                AreaId = a.AreaId,
                AreaName = a.AreaName,
                AreaType = a.AreaType,
                ParentAreaId = a.ParentAreaId,
                ParentAreaName = a.ParentArea != null
                    ? a.ParentArea.AreaName
                    : null,
                Code = a.Code,
                IsActive = a.IsActive
            })
            .FirstOrDefaultAsync();

        return area ?? throw new KeyNotFoundException(
            $"Area with ID {id} was not found.");
    }

    public async Task<IReadOnlyList<AreaHierarchyResponse>> GetHierarchyAsync()
    {
        var areas = await _context.Areas
            .AsNoTracking()
            .OrderBy(a => a.AreaName)
            .ToListAsync();

        var lookup = areas.ToDictionary(
            a => a.AreaId,
            a => new AreaHierarchyResponse
            {
                AreaId = a.AreaId,
                AreaName = a.AreaName,
                AreaType = a.AreaType,
                Code = a.Code,
                IsActive = a.IsActive
            });

        var roots = new List<AreaHierarchyResponse>();

        foreach (var area in areas)
        {
            var current = lookup[area.AreaId];

            if (area.ParentAreaId.HasValue &&
                lookup.TryGetValue(area.ParentAreaId.Value, out var parent))
            {
                parent.ChildAreas.Add(current);
            }
            else
            {
                roots.Add(current);
            }
        }

        return roots;
    }

    public async Task<AreaResponse> UpdateAsync(
        int id,
        UpdateAreaRequest request)
    {
        var area = await _context.Areas
            .FirstOrDefaultAsync(a => a.AreaId == id);

        if (area == null)
        {
            throw new KeyNotFoundException(
                $"Area with ID {id} was not found.");
        }

        await ValidateParentAsync(request.ParentAreaId, id);
        await ValidateCodeAsync(request.Code, id);

        area.AreaName = request.AreaName.Trim();
        area.AreaType = request.AreaType.Trim();
        area.ParentAreaId = request.ParentAreaId;
        area.Code = NormalizeCode(request.Code);
        area.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task DeleteAsync(int id)
    {
        var area = await _context.Areas
            .FirstOrDefaultAsync(a => a.AreaId == id);

        if (area == null)
        {
            throw new KeyNotFoundException(
                $"Area with ID {id} was not found.");
        }

        var hasChildren = await _context.Areas
            .AnyAsync(a => a.ParentAreaId == id);

        if (hasChildren)
        {
            throw new InvalidOperationException(
                "Cannot delete an area that has child areas.");
        }

        _context.Areas.Remove(area);
        await _context.SaveChangesAsync();
    }

    private async Task ValidateParentAsync(
        int? parentAreaId,
        int? currentAreaId)
    {
        if (!parentAreaId.HasValue)
        {
            return;
        }

        if (parentAreaId.Value <= 0)
        {
            throw new InvalidOperationException(
                "ParentAreaId must be a valid positive ID.");
        }

        if (currentAreaId.HasValue &&
            parentAreaId.Value == currentAreaId.Value)
        {
            throw new InvalidOperationException(
                "An area cannot be its own parent.");
        }

        var parentExists = await _context.Areas
            .AnyAsync(a => a.AreaId == parentAreaId.Value);

        if (!parentExists)
        {
            throw new KeyNotFoundException(
                $"Parent area with ID {parentAreaId.Value} was not found.");
        }

        if (currentAreaId.HasValue)
        {
            var descendants = await GetDescendantIdsAsync(currentAreaId.Value);

            if (descendants.Contains(parentAreaId.Value))
            {
                throw new InvalidOperationException(
                    "An area cannot be moved under one of its descendants.");
            }
        }
    }

    private async Task<List<int>> GetDescendantIdsAsync(int areaId)
    {
        var allAreas = await _context.Areas
            .AsNoTracking()
            .Select(a => new { a.AreaId, a.ParentAreaId })
            .ToListAsync();

        var descendants = new List<int>();
        var pending = new Stack<int>();

        pending.Push(areaId);

        while (pending.Count > 0)
        {
            var currentId = pending.Pop();

            var children = allAreas
                .Where(a => a.ParentAreaId == currentId)
                .Select(a => a.AreaId);

            foreach (var childId in children)
            {
                descendants.Add(childId);
                pending.Push(childId);
            }
        }

        return descendants;
    }

    private async Task ValidateCodeAsync(string? code, int? currentAreaId)
    {
        var normalizedCode = NormalizeCode(code);

        if (normalizedCode == null)
        {
            return;
        }

        var exists = await _context.Areas
            .AnyAsync(a =>
                a.Code == normalizedCode &&
                (!currentAreaId.HasValue || a.AreaId != currentAreaId.Value));

        if (exists)
        {
            throw new InvalidOperationException(
                $"Area code '{normalizedCode}' is already in use.");
        }
    }

    private static string? NormalizeCode(string? code)
    {
        return string.IsNullOrWhiteSpace(code)
            ? null
            : code.Trim();
    }
}
