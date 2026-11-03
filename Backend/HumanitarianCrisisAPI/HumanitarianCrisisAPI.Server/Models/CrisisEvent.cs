using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisAPI.Models;

public class CrisisEvent
{

    [Key]
    public int CrisisId { get; set; }

    public string CrisisName { get; set; } = string.Empty;

    public string CrisisType { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string SeverityLevel { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }

    public string Status { get; set; } = "Active";

    public ICollection<AssistanceRequest> AssistanceRequests
    { get; set; } = new List<AssistanceRequest>();
}

