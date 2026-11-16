using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.CrisisEvents;

public class UpdateCrisisStatusRequest
{
    [Required]
    [RegularExpression(
        "^(Reported|Active|Resolved|Closed)$",
        ErrorMessage = "Invalid crisis status.")]
    public string Status { get; set; } = string.Empty;
}
