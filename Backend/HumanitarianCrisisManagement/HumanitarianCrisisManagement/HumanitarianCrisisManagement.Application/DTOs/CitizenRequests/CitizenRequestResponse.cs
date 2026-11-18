namespace HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;

public class CitizenRequestResponse
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

    public string UrgencyLevel { get; set; } = string.Empty;

    public int PeopleCount { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Address { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}