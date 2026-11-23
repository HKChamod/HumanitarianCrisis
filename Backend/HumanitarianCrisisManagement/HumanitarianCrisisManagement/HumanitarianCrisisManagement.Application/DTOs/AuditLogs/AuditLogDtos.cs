namespace HumanitarianCrisisManagement.Application.DTOs.AuditLogs;

public class AuditLogResponse
{
    public long AuditLogId { get; set; }
    public int? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? ActorEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
