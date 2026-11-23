using HumanitarianCrisisManagement.Application.DTOs.Dashboard;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;

    public DashboardService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SystemDashboardResponse> GetSystemOverviewAsync()
    {
        var crises = await _context.CrisisEvents.AsNoTracking()
            .Select(c => new { c.Status, c.SeverityLevel })
            .ToListAsync();

        var requests = await _context.CitizenRequests.AsNoTracking()
            .Select(r => r.Status)
            .ToListAsync();

        var inventories = await _context.WarehouseInventories.AsNoTracking()
            .Select(i => new { i.QuantityAvailable, i.ReorderLevel })
            .ToListAsync();

        var allocations = await _context.ResourceAllocations.AsNoTracking()
            .Select(a => a.Status)
            .ToListAsync();

        var shelters = await _context.Shelters.AsNoTracking()
            .Where(s => s.IsActive)
            .Select(s => new { s.Status, s.Capacity, s.CurrentOccupancy })
            .ToListAsync();

        var volunteers = await _context.Volunteers.AsNoTracking()
            .Where(v => v.IsActive)
            .Select(v => new { v.AvailabilityStatus, v.ApprovalStatus })
            .ToListAsync();

        var activeAssignments = await _context.VolunteerAssignments.AsNoTracking()
            .CountAsync(a => a.Status == "Assigned" || a.Status == "Active");

        var donations = await _context.Donations.AsNoTracking()
            .Select(d => new { d.DonationType, d.Status, d.Amount })
            .ToListAsync();

        var totalResources = await _context.Resources.AsNoTracking().CountAsync(r => r.IsActive);
        var activeWarehouses = await _context.Warehouses.AsNoTracking().CountAsync(w => w.IsActive);
        var totalOrganizations = await _context.Organizations.AsNoTracking().CountAsync();
        var totalUsers = await _context.Users.AsNoTracking().CountAsync();
        var activeUsers = await _context.Users.AsNoTracking().CountAsync(u => u.IsActive);

        return new SystemDashboardResponse
        {
            GeneratedAtUtc = DateTime.UtcNow,

            TotalCrises = crises.Count,
            ActiveCrises = crises.Count(c =>
                !string.Equals(c.Status, "Closed", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(c.Status, "Resolved", StringComparison.OrdinalIgnoreCase)),
            CriticalCrises = crises.Count(c =>
                string.Equals(c.SeverityLevel, "Critical", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(c.Status, "Closed", StringComparison.OrdinalIgnoreCase)),

            TotalCitizenRequests = requests.Count,
            PendingCitizenRequests = requests.Count(s => string.Equals(s, "Pending", StringComparison.OrdinalIgnoreCase)),
            FulfilledCitizenRequests = requests.Count(s => string.Equals(s, "Fulfilled", StringComparison.OrdinalIgnoreCase)),

            TotalResources = totalResources,
            ActiveWarehouses = activeWarehouses,
            TotalAvailableStockUnits = inventories.Sum(i => i.QuantityAvailable),
            LowStockInventoryCount = inventories.Count(i => i.QuantityAvailable <= i.ReorderLevel),

            TotalAllocations = allocations.Count,
            PendingAllocations = allocations.Count(s => s == ResourceAllocationStatus.Pending),
            DispatchedAllocations = allocations.Count(s => s == ResourceAllocationStatus.Dispatched),
            DeliveredAllocations = allocations.Count(s => s == ResourceAllocationStatus.Delivered),

            TotalShelters = shelters.Count,
            OpenShelters = shelters.Count(s => string.Equals(s.Status, "Open", StringComparison.OrdinalIgnoreCase)),
            TotalShelterCapacity = shelters.Sum(s => s.Capacity),
            TotalShelterOccupancy = shelters.Sum(s => s.CurrentOccupancy),

            TotalVolunteers = volunteers.Count,
            AvailableVolunteers = volunteers.Count(v =>
                string.Equals(v.ApprovalStatus, "Approved", StringComparison.OrdinalIgnoreCase) &&
                string.Equals(v.AvailabilityStatus, "Available", StringComparison.OrdinalIgnoreCase)),
            ActiveVolunteerAssignments = activeAssignments,

            TotalDonations = donations.Count,
            VerifiedDonations = donations.Count(d =>
                string.Equals(d.Status, "Verified", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(d.Status, "Completed", StringComparison.OrdinalIgnoreCase)),
            TotalVerifiedMonetaryAmount = donations
                .Where(d => string.Equals(d.DonationType, "Monetary", StringComparison.OrdinalIgnoreCase) &&
                            (string.Equals(d.Status, "Verified", StringComparison.OrdinalIgnoreCase) ||
                             string.Equals(d.Status, "Completed", StringComparison.OrdinalIgnoreCase)))
                .Sum(d => d.Amount ?? 0m),

            TotalOrganizations = totalOrganizations,
            TotalUsers = totalUsers,
            ActiveUsers = activeUsers
        };
    }

    public async Task<OrganizationDashboardResponse> GetOrganizationOverviewAsync(int organizationId)
    {
        var org = await _context.Organizations
            .AsNoTracking()
            .FirstOrDefaultAsync(o => o.OrganizationId == organizationId);

        if (org == null)
            throw new KeyNotFoundException("Organization not found.");

        var activeMembers = await _context.OrganizationMemberships
            .AsNoTracking()
            .CountAsync(m => m.OrganizationId == organizationId && m.MembershipStatus == "Approved");

        var pendingMembers = await _context.OrganizationMemberships
            .AsNoTracking()
            .CountAsync(m => m.OrganizationId == organizationId && m.MembershipStatus == "Pending");

        var activeCrises = await _context.CrisisEvents
            .AsNoTracking()
            .CountAsync(c => c.Status != "Closed" && c.Status != "Resolved");

        var pendingRequests = await _context.CitizenRequests
            .AsNoTracking()
            .CountAsync(r => r.Status == "Pending");

        var totalAllocations = await _context.ResourceAllocations.AsNoTracking().CountAsync();
        var openShelters = await _context.Shelters.AsNoTracking().CountAsync(s => s.IsActive && s.Status == "Open");

        return new OrganizationDashboardResponse
        {
            OrganizationId = org.OrganizationId,
            OrganizationName = org.OrganizationName,
            Status = org.IsActive ? "Active" : "Inactive",
            ActiveMembersCount = activeMembers,
            PendingMembershipRequestsCount = pendingMembers,
            ActiveCrisesCount = activeCrises,
            PendingCitizenRequestsCount = pendingRequests,
            TotalAllocationsCount = totalAllocations,
            OpenSheltersCount = openShelters,
            GeneratedAtUtc = DateTime.UtcNow
        };
    }
}
