using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisAPI.Models;

public class AssistanceRequest
{
    [Key]
    public int RequestId { get; set; }

    public int CrisisId { get; set; }

    public int CitizenId { get; set; }

    public string Category { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string UrgencyLevel { get; set; } = "Normal";

    public string Status { get; set; } = "Pending";

    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    // Navigation properties
    public CrisisEvent Crisis { get; set; } = null!;

    public User Citizen { get; set; } = null!;
}