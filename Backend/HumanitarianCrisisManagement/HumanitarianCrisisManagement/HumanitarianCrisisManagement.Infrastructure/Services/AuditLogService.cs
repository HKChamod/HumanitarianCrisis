using HumanitarianCrisisManagement.Application.DTOs.AuditLogs;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;

    public AuditLogService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task RecordAsync(
        int? actorUserId,
        string? actorEmail,
        string action,
        string entityType,
        string? entityId,
        string summary,
        string status = "Success")
    {
        if (string.IsNullOrWhiteSpace(action) || string.IsNullOrWhiteSpace(entityType))
            return;

        var entry = new AuditLog
        {
            ActorUserId = actorUserId,
            ActorEmail = actorEmail?.Trim(),
            Action = Truncate(action.Trim(), 100),
            EntityType = Truncate(entityType.Trim(), 100),
            EntityId = string.IsNullOrWhiteSpace(entityId) ? null : Truncate(entityId.Trim(), 100),
            Summary = Truncate(string.IsNullOrWhiteSpace(summary) ? action.Trim() : summary.Trim(), 500),
            Status = string.IsNullOrWhiteSpace(status) ? "Success" : Truncate(status.Trim(), 30),
            CreatedAt = DateTime.UtcNow
        };

        _context.AuditLogs.Add(entry);
        await _context.SaveChangesAsync();
    }

    public async Task<IReadOnlyList<AuditLogResponse>> GetRecentAsync(
        string? entityType = null,
        string? action = null,
        int limit = 100)
    {
        var safeLimit = Math.Clamp(limit, 1, 500);
        var query = _context.AuditLogs
            .AsNoTracking()
            .Include(a => a.ActorUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            var normalizedEntity = entityType.Trim();
            query = query.Where(a => a.EntityType == normalizedEntity);
        }

        if (!string.IsNullOrWhiteSpace(action))
        {
            var normalizedAction = action.Trim();
            query = query.Where(a => a.Action.Contains(normalizedAction));
        }

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Take(safeLimit)
            .ToListAsync();

        return items.Select(a => new AuditLogResponse
        {
            AuditLogId = a.AuditLogId,
            ActorUserId = a.ActorUserId,
            ActorName = a.ActorUser?.FullName,
            ActorEmail = a.ActorEmail ?? a.ActorUser?.Email,
            Action = a.Action,
            EntityType = a.EntityType,
            EntityId = a.EntityId,
            Summary = a.Summary,
            Status = a.Status,
            CreatedAt = a.CreatedAt
        }).ToList();
    }

    private static string Truncate(string value, int maxLen) =>
        value.Length <= maxLen ? value : value[..maxLen];
}
