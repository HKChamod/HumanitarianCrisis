
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;


namespace HumanitarianCrisisManagement.Infrastructure.DependencyInjection;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        // Database
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseSqlServer(connectionString));

        // Authentication Services
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IPasswordHasherService, PasswordHasherService>();
        services.AddScoped<ICrisisEventService, CrisisEventService>();
        services.AddScoped<IAreaService, AreaService>();
        services.AddScoped<IOrganizationService, OrganizationService>();
        services.AddScoped<IOrganizationMembershipService, OrganizationMembershipService>();
        services.AddScoped<IOrganizationAuthorizationService, OrganizationAuthorizationService>();
        services.AddScoped<IResourceService, ResourceService>();
        services.AddScoped<IWarehouseService, WarehouseService>();
        services.AddScoped<IWarehouseInventoryService, WarehouseInventoryService>();
        services.AddScoped<ICitizenRequestService, CitizenRequestService>();
        services.AddScoped<IInventoryTransactionService, InventoryTransactionService>();
        services.AddScoped<IResourceAllocationService, ResourceAllocationService>();
        services.AddScoped<IShelterService, ShelterService>();
        services.AddScoped<IVolunteerService, VolunteerService>();
        services.AddScoped<IDonationService, DonationService>();
        services.AddScoped<IUserManagementService, UserManagementService>();
        services.AddScoped<IRoleManagementService, RoleManagementService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<IAuditLogService, AuditLogService>();

        services.AddAiAnalysisProviderSelection();
        services.AddScoped<IAiDecisionSupportService, AiDecisionSupportService>();

        return services;
    }

    public static IServiceCollection AddAiAnalysisProviderSelection(
        this IServiceCollection services)
    {
        services.AddOptions<AiProviderOptions>();
        services.AddSingleton<IAiTextPrivacySanitizer, AiTextPrivacySanitizer>();
        services.AddScoped<UnconfiguredAiAnalysisProvider>();
        services.AddScoped<IAiAnalysisProvider>(sp =>
        {
            var options = sp.GetRequiredService<IOptions<AiProviderOptions>>().Value;
            if (options.IsGroqConfigured)
            {
                return sp.GetRequiredService<GroqAiAnalysisProvider>();
            }

            if (options.IsGeminiConfigured)
            {
                return sp.GetRequiredService<GeminiAiAnalysisProvider>();
            }

            return sp.GetRequiredService<UnconfiguredAiAnalysisProvider>();
        });

        return services;
    }
}
