using System.ComponentModel.DataAnnotations;

namespace HumanitarianCrisisManagement.Application.DTOs.Notifications;

public class NotificationResponse
{
    public int NotificationId { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
    public bool IsRead { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateNotificationRequest
{
    public int UserId { get; set; }
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    [Required, MaxLength(1000)]
    public string Message { get; set; } = string.Empty;
    [MaxLength(50)]
    public string Category { get; set; } = "System";
    [MaxLength(30)]
    public string Severity { get; set; } = "Info";
    [MaxLength(100)]
    public string? RelatedEntityType { get; set; }
    public int? RelatedEntityId { get; set; }
}
