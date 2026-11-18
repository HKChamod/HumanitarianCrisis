using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.CitizenRequests;

public class UpdateCitizenRequestStatus
{
    [Required]
    [RegularExpression("Pending|Verified|Assigned|Fulfilled|Rejected")]
    public string Status { get; set; } = string.Empty;
}