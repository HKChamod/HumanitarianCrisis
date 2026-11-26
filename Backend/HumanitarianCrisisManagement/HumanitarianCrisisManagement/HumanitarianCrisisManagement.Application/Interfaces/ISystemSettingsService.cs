using HumanitarianCrisisManagement.Application.DTOs.SystemSettings;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface ISystemSettingsService
{
    Task<SystemSettingsResponse> GetSettingsAsync(CancellationToken cancellationToken = default);

    Task<SystemSettingsResponse> UpdateSettingsAsync(
        UpdateSystemSettingsRequest request,
        int actorUserId,
        string? actorEmail,
        CancellationToken cancellationToken = default);

    Task<SystemInformationResponse> GetSystemInformationAsync(
        bool isHttps,
        CancellationToken cancellationToken = default);

    SafeAiConfigurationResponse GetSafeAiConfiguration();
}
