namespace HumanitarianCrisisManagement.Domain.Entities;

public class AuditLog
{
    public long AuditLogId { get; set; }
    public int? ActorUserId { get; set; }
    public User? ActorUser { get; set; }
    public string? ActorEmail { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityType { get; set; } = string.Empty;
    public string? EntityId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string Status { get; set; } = "Success"; // Success, Failed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
