using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Organizations;

public class OrganizationDashboardResponse
{
    public int OrganizationId { get; set; }
    public string OrganizationName { get; set; } = string.Empty;
    public int TotalMembers { get; set; }
    public int ActiveMembers { get; set; }
    public int PendingMembers { get; set; }
    public int AssignedAreasCount { get; set; }
    public int ActiveCrisesCount { get; set; }
    public int CriticalCrisesCount { get; set; }
    public int OpenAidRequestsCount { get; set; }
    public int ScopedAidRequestsCount { get; set; }
    public int ResponseTeamsCount { get; set; }
    public int AvailableTeamsCount { get; set; }
    public int DeployedTeamsCount { get; set; }
    public int AssignedAllocationsCount { get; set; }
    public IReadOnlyList<OrganizationActivityItem> RecentActivity { get; set; } = Array.Empty<OrganizationActivityItem>();
}

public class OrganizationActivityItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
}

public class ResponseTeamMemberDto
{
    public int ResponseTeamMemberId { get; set; }
    public int MembershipId { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RoleInTeam { get; set; } = "Member";
    public DateTime JoinedAt { get; set; }
}

public class ResponseTeamDeploymentDto
{
    public int DeploymentId { get; set; }
    public int ResponseTeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int? CrisisId { get; set; }
    public string? CrisisName { get; set; }
    public int? CitizenRequestId { get; set; }
    public int? AreaId { get; set; }
    public string? AreaName { get; set; }
    public string MissionTitle { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = "Active";
    public DateTime DeployedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class ResponseTeamDto
{
    public int ResponseTeamId { get; set; }
    public int OrganizationId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public string TeamType { get; set; } = "General";
    public int? LeaderMembershipId { get; set; }
    public string? LeaderName { get; set; }
    public string? LeaderEmail { get; set; }
    public int? AreaId { get; set; }
    public string? AreaName { get; set; }
    public string? BaseStation { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? SpecializedEquipment { get; set; }
    public string Status { get; set; } = "Available";
    public int MembersCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public ResponseTeamDeploymentDto? ActiveDeployment { get; set; }
    public IReadOnlyList<ResponseTeamMemberDto> Members { get; set; } = Array.Empty<ResponseTeamMemberDto>();
    public IReadOnlyList<ResponseTeamDeploymentDto> Deployments { get; set; } = Array.Empty<ResponseTeamDeploymentDto>();
}

public class CreateResponseTeamRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string TeamName { get; set; } = string.Empty;

    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string TeamType { get; set; } = "General";

    public int? LeaderMembershipId { get; set; }

    public int? AreaId { get; set; }

    [StringLength(200)]
    public string? BaseStation { get; set; }

    [StringLength(30)]
    public string? ContactPhone { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? ContactEmail { get; set; }

    [StringLength(1000)]
    public string? SpecializedEquipment { get; set; }

    [RegularExpression("^(Available|Deployed|Unavailable|Inactive)$")]
    public string Status { get; set; } = "Available";
}

public class UpdateResponseTeamRequest
{
    [Required]
    [StringLength(150, MinimumLength = 2)]
    public string TeamName { get; set; } = string.Empty;

    [Required]
    [StringLength(80, MinimumLength = 2)]
    public string TeamType { get; set; } = "General";

    public int? LeaderMembershipId { get; set; }

    public int? AreaId { get; set; }

    [StringLength(200)]
    public string? BaseStation { get; set; }

    [StringLength(30)]
    public string? ContactPhone { get; set; }

    [EmailAddress]
    [StringLength(256)]
    public string? ContactEmail { get; set; }

    [StringLength(1000)]
    public string? SpecializedEquipment { get; set; }

    [RegularExpression("^(Available|Deployed|Unavailable|Inactive)$")]
    public string Status { get; set; } = "Available";
}

public class UpdateResponseTeamStatusRequest
{
    [Required]
    [RegularExpression("^(Available|Deployed|Unavailable|Inactive)$")]
    public string Status { get; set; } = "Available";
}

public class AddResponseTeamMemberRequest
{
    [Required]
    public int MembershipId { get; set; }

    [StringLength(50)]
    public string RoleInTeam { get; set; } = "Member";
}

public class CreateTeamDeploymentRequest
{
    public int? CrisisId { get; set; }
    public int? CitizenRequestId { get; set; }
    public int? AreaId { get; set; }

    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string MissionTitle { get; set; } = string.Empty;

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class CompleteTeamDeploymentRequest
{
    [RegularExpression("^(Completed|Cancelled)$")]
    public string Status { get; set; } = "Completed";
}

public class OrganizationAreaDto
{
    public int OrganizationAreaId { get; set; }
    public int OrganizationId { get; set; }
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string AreaType { get; set; } = string.Empty;
    public string? ParentAreaName { get; set; }
    public string? Code { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public string AssignmentStatus { get; set; } = "Active";
    public string? PrimaryContact { get; set; }
    public string? Notes { get; set; }
    public DateTime AssignedAt { get; set; }
    public int ActiveCrisesCount { get; set; }
    public int OpenRequestsCount { get; set; }
    public int AssignedTeamsCount { get; set; }
}

public class AssignOrganizationAreaRequest
{
    [Required]
    public int AreaId { get; set; }

    [RegularExpression("^(Active|Standby|Completed)$")]
    public string AssignmentStatus { get; set; } = "Active";

    [StringLength(150)]
    public string? PrimaryContact { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateOrganizationAreaRequest
{
    [Required]
    [RegularExpression("^(Active|Standby|Completed)$")]
    public string AssignmentStatus { get; set; } = "Active";

    [StringLength(150)]
    public string? PrimaryContact { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class OrganizationAidRequestDto
{
    public int RequestId { get; set; }
    public int UserId { get; set; }
    public string CitizenName { get; set; } = string.Empty;
    public int? CrisisId { get; set; }
    public string? CrisisName { get; set; }
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string UrgencyLevel { get; set; } = "Medium";
    public int PeopleCount { get; set; }
    public string Status { get; set; } = "Pending";
    public string? Address { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsInAssignedArea { get; set; }
    public int? AssignedTeamId { get; set; }
    public string? AssignedTeamName { get; set; }
    public int? ActiveDeploymentId { get; set; }
}

public class AssignTeamToAidRequestInput
{
    [Required]
    public int ResponseTeamId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateOrgAidRequestStatusInput
{
    [Required]
    [RegularExpression("^(Pending|Verified|Assigned|Fulfilled|Rejected)$")]
    public string Status { get; set; } = string.Empty;
}

public class OrganizationLogisticsResponse
{
    public IReadOnlyList<OrganizationWarehouseDto> Warehouses { get; set; } = Array.Empty<OrganizationWarehouseDto>();
    public IReadOnlyList<OrganizationInventoryDto> Inventories { get; set; } = Array.Empty<OrganizationInventoryDto>();
    public IReadOnlyList<OrganizationAllocationDto> Allocations { get; set; } = Array.Empty<OrganizationAllocationDto>();
}

public class OrganizationWarehouseDto
{
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public bool IsActive { get; set; }
}

public class OrganizationInventoryDto
{
    public int InventoryId { get; set; }
    public int WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int ResourceId { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public string UnitOfMeasure { get; set; } = "units";
    public decimal QuantityAvailable { get; set; }
    public decimal ReorderLevel { get; set; }
}

public class OrganizationAllocationDto
{
    public int AllocationId { get; set; }
    public int InventoryId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public int ResourceId { get; set; }
    public string ResourceName { get; set; } = string.Empty;
    public int CrisisId { get; set; }
    public string CrisisName { get; set; } = string.Empty;
    public int? CitizenRequestId { get; set; }
    public decimal QuantityRequested { get; set; }
    public decimal QuantityAllocated { get; set; }
    public string Status { get; set; } = string.Empty;
    public string RequestedByUserName { get; set; } = string.Empty;
    public string? ApprovedByUserName { get; set; }
    public string? ReferenceNumber { get; set; }
    public DateTime CreatedAt { get; set; }
}
