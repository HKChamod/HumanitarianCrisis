using HumanitarianCrisisManagement.Application.DTOs.Resources;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class ResourceService : IResourceService
{
    private readonly ApplicationDbContext _context;

    public ResourceService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ResourceResponse> CreateAsync(
        CreateResourceRequest request)
    {
        var resourceName = request.ResourceName.Trim();

        var exists = await _context.Resources.AnyAsync(r =>
            r.ResourceName.ToLower() == resourceName.ToLower());

        if (exists)
        {
            throw new InvalidOperationException(
                "A resource with this name already exists.");
        }

        var resource = new Resource
        {
            ResourceName = resourceName,
            ResourceCategory = request.ResourceCategory.Trim(),
            Description = request.Description?.Trim(),
            UnitOfMeasure = request.UnitOfMeasure.Trim(),
            IsPerishable = request.IsPerishable,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Resources.Add(resource);
        await _context.SaveChangesAsync();

        return MapToResponse(resource);
    }

    public async Task<IReadOnlyList<ResourceResponse>> GetAllAsync()
    {
        var resources = await _context.Resources
            .AsNoTracking()
            .OrderBy(r => r.ResourceName)
            .ToListAsync();

        return resources.Select(MapToResponse).ToList();
    }

    public async Task<ResourceResponse> GetByIdAsync(int id)
    {
        var resource = await _context.Resources
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.ResourceId == id);

        if (resource == null)
        {
            throw new KeyNotFoundException(
                $"Resource with ID {id} was not found.");
        }

        return MapToResponse(resource);
    }

    public async Task<ResourceResponse> UpdateAsync(
        int id,
        UpdateResourceRequest request)
    {
        var resource = await _context.Resources
            .FirstOrDefaultAsync(r => r.ResourceId == id);

        if (resource == null)
        {
            throw new KeyNotFoundException(
                $"Resource with ID {id} was not found.");
        }

        var resourceName = request.ResourceName.Trim();

        var duplicateExists = await _context.Resources.AnyAsync(r =>
            r.ResourceId != id &&
            r.ResourceName.ToLower() == resourceName.ToLower());

        if (duplicateExists)
        {
            throw new InvalidOperationException(
                "A resource with this name already exists.");
        }

        resource.ResourceName = resourceName;
        resource.ResourceCategory = request.ResourceCategory.Trim();
        resource.Description = request.Description?.Trim();
        resource.UnitOfMeasure = request.UnitOfMeasure.Trim();
        resource.IsPerishable = request.IsPerishable;
        resource.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return MapToResponse(resource);
    }

    public async Task DeleteAsync(int id)
    {
        var resource = await _context.Resources
            .FirstOrDefaultAsync(r => r.ResourceId == id);

        if (resource == null)
        {
            throw new KeyNotFoundException(
                $"Resource with ID {id} was not found.");
        }

        _context.Resources.Remove(resource);
        await _context.SaveChangesAsync();
    }

    private static ResourceResponse MapToResponse(Resource resource)
    {
        return new ResourceResponse
        {
            ResourceId = resource.ResourceId,
            ResourceName = resource.ResourceName,
            ResourceCategory = resource.ResourceCategory,
            Description = resource.Description,
            UnitOfMeasure = resource.UnitOfMeasure,
            IsPerishable = resource.IsPerishable,
            IsActive = resource.IsActive,
            CreatedAt = resource.CreatedAt
        };
    }
}