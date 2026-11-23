using HumanitarianCrisisManagement.Application.DTOs.Notifications;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface INotificationService
{
    Task<IReadOnlyList<NotificationResponse>> GetForUserAsync(int userId, bool unreadOnly = false, int limit = 50);
    Task<IReadOnlyList<NotificationResponse>> GetAllRecentAsync(int limit = 100);
    Task<NotificationResponse> CreateAsync(CreateNotificationRequest request);
    Task NotifyUsersByRoleAsync(string roleName, string title, string message, string category, string severity = "Info", string? relatedEntityType = null, int? relatedEntityId = null);
    Task<NotificationResponse> MarkAsReadAsync(int notificationId, int userId);
    Task<int> MarkAllAsReadAsync(int userId);
}
