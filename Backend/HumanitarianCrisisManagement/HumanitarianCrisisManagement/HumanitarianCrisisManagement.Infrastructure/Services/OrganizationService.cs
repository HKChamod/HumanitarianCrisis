
using HumanitarianCrisisManagement.Application.DTOs.Organizations;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class OrganizationService : IOrganizationService
{
    private readonly ApplicationDbContext _context;

    public OrganizationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrganizationResponse> CreateAsync(
        CreateOrganizationRequest request)
    {
        var registrationNumber = Normalize(request.RegistrationNumber);

        await ValidateRegistrationNumberAsync(registrationNumber);

        var organization = new Organization
        {
            OrganizationName = request.OrganizationName.Trim(),
            OrganizationType = request.OrganizationType.Trim(),
            RegistrationNumber = registrationNumber,
            Description = Normalize(request.Description),
            Email = Normalize(request.Email),
            PhoneNumber = Normalize(request.PhoneNumber),
            Address = Normalize(request.Address),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Organizations.Add(organization);
        await _context.SaveChangesAsync();

        return MapToResponse(organization, 0);
    }

    public async Task<IReadOnlyList<OrganizationResponse>> GetAllAsync()
    {
        return await _context.Organizations
            .AsNoTracking()
            .OrderBy(o => o.OrganizationName)
            .Select(o => new OrganizationResponse
            {
                OrganizationId = o.OrganizationId,
                OrganizationName = o.OrganizationName,
                OrganizationType = o.OrganizationType,
                RegistrationNumber = o.RegistrationNumber,
                Description = o.Description,
                Email = o.Email,
                PhoneNumber = o.PhoneNumber,
                Address = o.Address,
                Latitude = o.Latitude,
                Longitude = o.Longitude,
                Website = o.Website,
                PrimaryContactName = o.PrimaryContactName,
                EmergencyContactPhone = o.EmergencyContactPhone,
                PreferredLanguage = o.PreferredLanguage,
                EmailAlertsEnabled = o.EmailAlertsEnabled,
                CrisisAlertsEnabled = o.CrisisAlertsEnabled,
                RequestAlertsEnabled = o.RequestAlertsEnabled,
                AutoAssignNotifications = o.AutoAssignNotifications,
                CompactTables = o.CompactTables,
                IsActive = o.IsActive,
                CreatedAt = o.CreatedAt,
                MemberCount = o.Memberships.Count()
            })
            .ToListAsync();
    }

    public async Task<OrganizationResponse> GetByIdAsync(int id)
    {
        var organization = await _context.Organizations
            .AsNoTracking()
            .Where(o => o.OrganizationId == id)
            .Select(o => new OrganizationResponse
            {
                OrganizationId = o.OrganizationId,
                OrganizationName = o.OrganizationName,
                OrganizationType = o.OrganizationType,
                RegistrationNumber = o.RegistrationNumber,
                Description = o.Description,
                Email = o.Email,
                PhoneNumber = o.PhoneNumber,
                Address = o.Address,
                Latitude = o.Latitude,
                Longitude = o.Longitude,
                Website = o.Website,
                PrimaryContactName = o.PrimaryContactName,
                EmergencyContactPhone = o.EmergencyContactPhone,
                PreferredLanguage = o.PreferredLanguage,
                EmailAlertsEnabled = o.EmailAlertsEnabled,
                CrisisAlertsEnabled = o.CrisisAlertsEnabled,
                RequestAlertsEnabled = o.RequestAlertsEnabled,
                AutoAssignNotifications = o.AutoAssignNotifications,
                CompactTables = o.CompactTables,
                IsActive = o.IsActive,
                CreatedAt = o.CreatedAt,
                MemberCount = o.Memberships.Count()
            })
            .FirstOrDefaultAsync();

        return organization
            ?? throw new KeyNotFoundException(
                $"Organization with ID {id} was not found.");
    }

    public async Task<OrganizationResponse> UpdateAsync(
        int id,
        UpdateOrganizationRequest request)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.OrganizationId == id);

        if (organization == null)
        {
            throw new KeyNotFoundException(
                $"Organization with ID {id} was not found.");
        }

        var registrationNumber = Normalize(request.RegistrationNumber);

        await ValidateRegistrationNumberAsync(registrationNumber, id);

        organization.OrganizationName = request.OrganizationName.Trim();
        organization.OrganizationType = request.OrganizationType.Trim();
        organization.RegistrationNumber = registrationNumber;
        organization.Description = Normalize(request.Description);
        organization.Email = Normalize(request.Email);
        organization.PhoneNumber = Normalize(request.PhoneNumber);
        organization.Address = Normalize(request.Address);
        organization.Latitude = request.Latitude;
        organization.Longitude = request.Longitude;
        organization.Website = Normalize(request.Website);
        organization.PrimaryContactName = Normalize(request.PrimaryContactName);
        organization.EmergencyContactPhone = Normalize(request.EmergencyContactPhone);
        organization.PreferredLanguage = string.IsNullOrWhiteSpace(request.PreferredLanguage)
            ? "en"
            : request.PreferredLanguage.Trim().ToLowerInvariant();
        organization.EmailAlertsEnabled = request.EmailAlertsEnabled;
        organization.CrisisAlertsEnabled = request.CrisisAlertsEnabled;
        organization.RequestAlertsEnabled = request.RequestAlertsEnabled;
        organization.AutoAssignNotifications = request.AutoAssignNotifications;
        organization.CompactTables = request.CompactTables;
        organization.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        var memberCount = await _context.OrganizationMemberships
            .CountAsync(m => m.OrganizationId == id);

        return MapToResponse(organization, memberCount);
    }

    public async Task DeleteAsync(int id)
    {
        var organization = await _context.Organizations
            .FirstOrDefaultAsync(o => o.OrganizationId == id);

        if (organization == null)
        {
            throw new KeyNotFoundException(
                $"Organization with ID {id} was not found.");
        }

        var hasMemberships = await _context.OrganizationMemberships
            .AnyAsync(m => m.OrganizationId == id);

        if (hasMemberships)
        {
            throw new InvalidOperationException(
                "Cannot delete an organization that has memberships.");
        }

        _context.Organizations.Remove(organization);
        await _context.SaveChangesAsync();
    }

    private async Task ValidateRegistrationNumberAsync(
        string? registrationNumber,
        int? excludeOrganizationId = null)
    {
        if (registrationNumber == null)
        {
            return;
        }

        var exists = await _context.Organizations.AnyAsync(o =>
            o.RegistrationNumber == registrationNumber &&
            (!excludeOrganizationId.HasValue ||
             o.OrganizationId != excludeOrganizationId.Value));

        if (exists)
        {
            throw new InvalidOperationException(
                "An organization with this registration number already exists.");
        }
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static OrganizationResponse MapToResponse(
        Organization organization,
        int memberCount)
    {
        return new OrganizationResponse
        {
            OrganizationId = organization.OrganizationId,
            OrganizationName = organization.OrganizationName,
            OrganizationType = organization.OrganizationType,
            RegistrationNumber = organization.RegistrationNumber,
            Description = organization.Description,
            Email = organization.Email,
            PhoneNumber = organization.PhoneNumber,
            Address = organization.Address,
            Latitude = organization.Latitude,
            Longitude = organization.Longitude,
            Website = organization.Website,
            PrimaryContactName = organization.PrimaryContactName,
            EmergencyContactPhone = organization.EmergencyContactPhone,
            PreferredLanguage = organization.PreferredLanguage,
            EmailAlertsEnabled = organization.EmailAlertsEnabled,
            CrisisAlertsEnabled = organization.CrisisAlertsEnabled,
            RequestAlertsEnabled = organization.RequestAlertsEnabled,
            AutoAssignNotifications = organization.AutoAssignNotifications,
            CompactTables = organization.CompactTables,
            IsActive = organization.IsActive,
            CreatedAt = organization.CreatedAt,
            MemberCount = memberCount
        };
    }
}
