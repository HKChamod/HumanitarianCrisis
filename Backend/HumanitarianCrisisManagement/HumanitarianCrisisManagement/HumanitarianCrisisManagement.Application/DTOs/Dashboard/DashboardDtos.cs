namespace HumanitarianCrisisManagement.Application.DTOs.Dashboard;

public class SystemDashboardResponse
{
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;

    // Crises
    public int TotalCrises { get; set; }
    public int ActiveCrises { get; set; }
    public int CriticalCrises { get; set; }

    // Citizen Requests
    public int TotalCitizenRequests { get; set; }
    public int PendingCitizenRequests { get; set; }
    public int FulfilledCitizenRequests { get; set; }

    // Resources & Inventory
    public int TotalResources { get; set; }
    public int ActiveWarehouses { get; set; }
    public decimal TotalAvailableStockUnits { get; set; }
    public int LowStockInventoryCount { get; set; }

    // Allocations
    public int TotalAllocations { get; set; }
    public int PendingAllocations { get; set; }
    public int DispatchedAllocations { get; set; }
    public int DeliveredAllocations { get; set; }

    // Shelters
    public int TotalShelters { get; set; }
    public int OpenShelters { get; set; }
    public int TotalShelterCapacity { get; set; }
    public int TotalShelterOccupancy { get; set; }
    public int AvailableShelterCapacity => Math.Max(0, TotalShelterCapacity - TotalShelterOccupancy);

    // Volunteers
    public int TotalVolunteers { get; set; }
    public int AvailableVolunteers { get; set; }
    public int ActiveVolunteerAssignments { get; set; }

    // Donations
    public int TotalDonations { get; set; }
    public int VerifiedDonations { get; set; }
    public decimal TotalVerifiedMonetaryAmount { get; set; }

    // Organizations & Users
    public int TotalOrganizations { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
}

public class OrganizationDashboardResponse
{
    public int OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ActiveMembersCount { get; set; }
    public int PendingMembershipRequestsCount { get; set; }
    public int ActiveCrisesCount { get; set; }
    public int PendingCitizenRequestsCount { get; set; }
    public int TotalAllocationsCount { get; set; }
    public int OpenSheltersCount { get; set; }
    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
}
