using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Volunteers;

public class VolunteerResponse
{
    public int VolunteerId { get; set; }
    public int? UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public int? AreaId { get; set; }
    public string? AreaName { get; set; }
    public string Skills { get; set; } = string.Empty;
    public string AvailabilityStatus { get; set; } = string.Empty;
    public string ApprovalStatus { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int ActiveAssignmentsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateVolunteerRequest
{
    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress, MaxLength(200)]
    public string Email { get; set; } = string.Empty;
    [MaxLength(40)]
    public string? PhoneNumber { get; set; }
    public int? AreaId { get; set; }
    [Required, MaxLength(1000)]
    public string Skills { get; set; } = string.Empty;
    [MaxLength(30)]
    public string AvailabilityStatus { get; set; } = "Available";
}

public class UpdateVolunteerRequest
{
    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;
    [MaxLength(40)]
    public string? PhoneNumber { get; set; }
    public int? AreaId { get; set; }
    [Required, MaxLength(1000)]
    public string Skills { get; set; } = string.Empty;
    [Required, MaxLength(30)]
    public string AvailabilityStatus { get; set; } = "Available";
    public bool IsActive { get; set; } = true;
}

public class UpdateVolunteerApprovalRequest
{
    [Required, MaxLength(30)]
    public string ApprovalStatus { get; set; } = string.Empty; // Approved, Rejected
}

public class VolunteerAssignmentResponse
{
    public int AssignmentId { get; set; }
    public int VolunteerId { get; set; }
    public string VolunteerName { get; set; } = string.Empty;
    public int CrisisId { get; set; }
    public string CrisisName { get; set; } = string.Empty;
    public string RoleTitle { get; set; } = string.Empty;
    public string? TaskDescription { get; set; }
    public string Status { get; set; } = string.Empty;
    public int AssignedByUserId { get; set; }
    public string AssignedByUserName { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? Notes { get; set; }
}

public class CreateVolunteerAssignmentRequest
{
    public int VolunteerId { get; set; }
    public int CrisisId { get; set; }
    [Required, MaxLength(150)]
    public string RoleTitle { get; set; } = string.Empty;
    [MaxLength(1000)]
    public string? TaskDescription { get; set; }
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class UpdateVolunteerAssignmentStatusRequest
{
    [Required, MaxLength(30)]
    public string Status { get; set; } = string.Empty; // Active, Completed, Cancelled
    [MaxLength(1000)]
    public string? Notes { get; set; }
}
