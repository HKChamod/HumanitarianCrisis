using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Application.Options;
using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HumanitarianCrisisManagement.Infrastructure.Data;

/// <summary>
/// Development-only user seeder driven by configuration/User Secrets (<c>DevelopmentSeed</c>).
/// Never hardcodes credentials, never runs outside Development, and never creates duplicate users.
/// </summary>
public class DevelopmentUserSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly DevelopmentSeedOptions _options;
    private readonly ILogger<DevelopmentUserSeeder> _logger;

    public DevelopmentUserSeeder(
        ApplicationDbContext context,
        IPasswordHasherService passwordHasher,
        IOptions<DevelopmentSeedOptions> options,
        ILogger<DevelopmentUserSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled || _options.Users.Count == 0)
        {
            return;
        }

        var createdCount = 0;

        foreach (var entry in _options.Users)
        {
            if (string.IsNullOrWhiteSpace(entry.Email) ||
                string.IsNullOrWhiteSpace(entry.Password) ||
                string.IsNullOrWhiteSpace(entry.FullName))
            {
                continue;
            }

            var normalizedEmail = entry.Email.Trim().ToLowerInvariant();
            var exists = await _context.Users
                .AnyAsync(u => u.Email.ToLower() == normalizedEmail, cancellationToken);

            if (exists)
            {
                continue;
            }

            var targetRoleName = string.IsNullOrWhiteSpace(entry.RoleName)
                ? "Citizen"
                : entry.RoleName.Trim();

            var role = await _context.Roles
                .FirstOrDefaultAsync(
                    r => r.RoleName == targetRoleName && r.OrganizationId == null,
                    cancellationToken);

            if (role == null)
            {
                _logger.LogWarning(
                    "Development user seed skipped an entry because global role '{RoleName}' was not found.",
                    targetRoleName);
                continue;
            }

            var user = new User
            {
                FullName = entry.FullName.Trim(),
                Email = normalizedEmail,
                PhoneNumber = string.IsNullOrWhiteSpace(entry.PhoneNumber)
                    ? null
                    : entry.PhoneNumber.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            user.PasswordHash = _passwordHasher.HashPassword(user, entry.Password);
            user.UserRoles.Add(new UserRole
            {
                User = user,
                RoleId = role.RoleId,
                Role = role
            });

            _context.Users.Add(user);
            createdCount++;
        }

        if (createdCount > 0)
        {
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation(
                "Development user seeder created {Count} configured user account(s).",
                createdCount);
        }
    }
}
