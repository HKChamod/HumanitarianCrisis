using HumanitarianCrisisManagement.Application.DTOs.AuditLogs;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IAuditLogService
{
    Task RecordAsync(
        int? actorUserId,
        string? actorEmail,
        string action,
        string entityType,
        string? entityId,
        string summary,
        string status = "Success");

    Task<IReadOnlyList<AuditLogResponse>> GetRecentAsync(
        string? entityType = null,
        string? action = null,
        int limit = 100);
}
