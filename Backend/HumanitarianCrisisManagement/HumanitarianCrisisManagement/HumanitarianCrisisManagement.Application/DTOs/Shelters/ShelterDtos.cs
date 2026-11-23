using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Shelters;

public class ShelterResponse
{
    public int ShelterId { get; set; }
    public string ShelterName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    public string AreaName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public int Capacity { get; set; }
    public int CurrentOccupancy { get; set; }
    public int AvailableCapacity => Math.Max(0, Capacity - CurrentOccupancy);
    public string Status { get; set; } = string.Empty;
    public string? ContactName { get; set; }
    public string? ContactPhone { get; set; }
    public string? Facilities { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateShelterRequest
{
    [Required, MaxLength(200)]
    public string ShelterName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    [Required, MaxLength(500)]
    public string Address { get; set; } = string.Empty;
    [Range(1, 100000)]
    public int Capacity { get; set; }
    [Range(0, 100000)]
    public int CurrentOccupancy { get; set; }
    [MaxLength(30)]
    public string Status { get; set; } = "Open";
    [MaxLength(150)]
    public string? ContactName { get; set; }
    [MaxLength(40)]
    public string? ContactPhone { get; set; }
    [MaxLength(1000)]
    public string? Facilities { get; set; }
}

public class UpdateShelterRequest
{
    [Required, MaxLength(200)]
    public string ShelterName { get; set; } = string.Empty;
    public int AreaId { get; set; }
    [Required, MaxLength(500)]
    public string Address { get; set; } = string.Empty;
    [Range(1, 100000)]
    public int Capacity { get; set; }
    [Range(0, 100000)]
    public int CurrentOccupancy { get; set; }
    [Required, MaxLength(30)]
    public string Status { get; set; } = "Open";
    [MaxLength(150)]
    public string? ContactName { get; set; }
    [MaxLength(40)]
    public string? ContactPhone { get; set; }
    [MaxLength(1000)]
    public string? Facilities { get; set; }
    public bool IsActive { get; set; } = true;
}

public class ShelterPlacementResponse
{
    public int PlacementId { get; set; }
    public int ShelterId { get; set; }
    public string ShelterName { get; set; } = string.Empty;
    public int? CitizenRequestId { get; set; }
    public string ResidentName { get; set; } = string.Empty;
    public int PeopleCount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int? AssignedByUserId { get; set; }
    public string? AssignedByUserName { get; set; }
    public DateTime CheckedInAt { get; set; }
    public DateTime? CheckedOutAt { get; set; }
}

public class CreateShelterPlacementRequest
{
    public int ShelterId { get; set; }
    public int? CitizenRequestId { get; set; }
    [Required, MaxLength(200)]
    public string ResidentName { get; set; } = string.Empty;
    [Range(1, 500)]
    public int PeopleCount { get; set; } = 1;
    [MaxLength(1000)]
    public string? Notes { get; set; }
}
