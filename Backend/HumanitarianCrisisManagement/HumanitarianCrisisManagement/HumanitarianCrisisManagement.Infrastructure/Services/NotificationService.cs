using HumanitarianCrisisManagement.Application.DTOs.Notifications;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ISystemSettingsService? _systemSettingsService;

    public NotificationService(
        ApplicationDbContext context,
        ISystemSettingsService? systemSettingsService = null)
    {
        _context = context;
        _systemSettingsService = systemSettingsService;
    }

    public async Task<IReadOnlyList<NotificationResponse>> GetForUserAsync(
        int userId,
        bool unreadOnly = false,
        int limit = 50)
    {
        var safeLimit = Math.Clamp(limit, 1, 200);
        var query = _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            query = query.Where(n => !n.IsRead);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(safeLimit)
            .ToListAsync();

        return items.Select(MapToResponse).ToList();
    }

    public async Task<IReadOnlyList<NotificationResponse>> GetAllRecentAsync(int limit = 100)
    {
        var safeLimit = Math.Clamp(limit, 1, 250);
        var items = await _context.Notifications
            .AsNoTracking()
            .OrderByDescending(n => n.CreatedAt)
            .Take(safeLimit)
            .ToListAsync();

        return items.Select(MapToResponse).ToList();
    }

    public async Task<NotificationResponse> CreateAsync(CreateNotificationRequest request)
    {
        var userExists = await _context.Users.AnyAsync(u => u.UserId == request.UserId && u.IsActive);
        if (!userExists)
            throw new KeyNotFoundException("Target active user not found.");

        var entity = new Notification
        {
            UserId = request.UserId,
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            Category = string.IsNullOrWhiteSpace(request.Category) ? "System" : request.Category.Trim(),
            Severity = string.IsNullOrWhiteSpace(request.Severity) ? "Info" : request.Severity.Trim(),
            RelatedEntityType = request.RelatedEntityType?.Trim(),
            RelatedEntityId = request.RelatedEntityId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Notifications.Add(entity);
        await _context.SaveChangesAsync();

        return MapToResponse(entity);
    }

    public async Task NotifyUsersByRoleAsync(
        string roleName,
        string title,
        string message,
        string category,
        string severity = "Info",
        string? relatedEntityType = null,
        int? relatedEntityId = null)
    {
        if (_systemSettingsService != null)
        {
            var settings = await _systemSettingsService.GetSettingsAsync();
            var notif = settings.Notification;
            if (!notif.SystemNotificationsEnabled)
                return;

            var cat = category.Trim();
            if (cat.Equals("Crisis", StringComparison.OrdinalIgnoreCase) && !notif.EnableCrisisAlerts)
                return;
            if (cat.Equals("Request", StringComparison.OrdinalIgnoreCase) && !notif.EnableRequestAlerts)
                return;
            if ((cat.Equals("Allocation", StringComparison.OrdinalIgnoreCase) || cat.Equals("Inventory", StringComparison.OrdinalIgnoreCase)) && !notif.EnableLowStockAlerts)
                return;
            if (cat.Equals("Shelter", StringComparison.OrdinalIgnoreCase) && !notif.EnableShelterAlerts)
                return;
        }

        var userIds = await _context.UserRoles
            .AsNoTracking()
            .Where(ur => ur.Role.RoleName == roleName && ur.User.IsActive)
            .Select(ur => ur.UserId)
            .Distinct()
            .ToListAsync();

        if (userIds.Count == 0)
            return;

        var now = DateTime.UtcNow;
        var notifications = userIds.Select(uid => new Notification
        {
            UserId = uid,
            Title = title.Trim(),
            Message = message.Trim(),
            Category = category.Trim(),
            Severity = severity.Trim(),
            RelatedEntityType = relatedEntityType?.Trim(),
            RelatedEntityId = relatedEntityId,
            IsRead = false,
            CreatedAt = now
        }).ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();
    }

    public async Task<NotificationResponse> MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.NotificationId == notificationId && n.UserId == userId);

        if (notification == null)
            throw new KeyNotFoundException("Notification not found.");

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return MapToResponse(notification);
    }

    public async Task<int> MarkAllAsReadAsync(int userId)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        if (unread.Count == 0)
            return 0;

        var now = DateTime.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
        }

        await _context.SaveChangesAsync();
        return unread.Count;
    }

    private static NotificationResponse MapToResponse(Notification n) => new()
    {
        NotificationId = n.NotificationId,
        UserId = n.UserId,
        Title = n.Title,
        Message = n.Message,
        Category = n.Category,
        Severity = n.Severity,
        RelatedEntityType = n.RelatedEntityType,
        RelatedEntityId = n.RelatedEntityId,
        IsRead = n.IsRead,
        ReadAt = n.ReadAt,
        CreatedAt = n.CreatedAt
    };
}
