using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HumanitarianCrisisManagement.API.Health;

public sealed class DatabaseReadinessHealthCheck : IHealthCheck
{
    private readonly ApplicationDbContext _context;

    public DatabaseReadinessHealthCheck(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _context.Database.CanConnectAsync(cancellationToken);
            return canConnect
                ? HealthCheckResult.Healthy("Database reachable.")
                : HealthCheckResult.Unhealthy("Database unavailable.");
        }
        catch
        {
            return HealthCheckResult.Unhealthy("Database unavailable.");
        }
    }
}
