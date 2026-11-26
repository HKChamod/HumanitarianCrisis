using System.Text;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace HumanitarianCrisisManagement.Infrastructure.Data;

public class SyntheticSeedingReport
{
    public string DatabaseName { get; set; } = string.Empty;
    public string EnvironmentName { get; set; } = string.Empty;
    public Dictionary<string, int> InsertedCounts { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int> SkippedCounts { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, int> FinalCounts { get; } = new(StringComparer.OrdinalIgnoreCase);
    public int RecordsFailed { get; set; }
    public bool InventoryConsistencyPassed { get; set; }
    public bool ShelterOccupancyConsistencyPassed { get; set; }
    public bool ForeignKeyVerificationPassed { get; set; }
    public bool Succeeded { get; set; }
    public string? ErrorMessage { get; set; }

    public int TotalInserted => InsertedCounts.Values.Sum();
    public int TotalSkipped => SkippedCounts.Values.Sum();

    public string FormatSummary()
    {
        var sb = new StringBuilder();
        sb.AppendLine("============================================================");
        sb.AppendLine("HCMS SYNTHETIC DATA SEEDING REPORT");
        sb.AppendLine("============================================================");
        sb.AppendLine($"Database:    {DatabaseName}");
        sb.AppendLine($"Environment: {EnvironmentName}");
        sb.AppendLine();

        foreach (var key in InsertedCounts.Keys)
        {
            var ins = InsertedCounts.GetValueOrDefault(key);
            var skip = SkippedCounts.GetValueOrDefault(key);
            var fin = FinalCounts.GetValueOrDefault(key);
            sb.AppendLine($"{key + ":",-32} {ins,3} inserted | {skip,3} skipped | {fin,4} total");
        }

        sb.AppendLine("------------------------------------------------------------");
        sb.AppendLine($"Total Records Inserted:        {TotalInserted}");
        sb.AppendLine($"Total Existing Skipped:        {TotalSkipped}");
        sb.AppendLine($"Records Failed:                {RecordsFailed}");
        sb.AppendLine("Note: Migration-seeded reference data (6 global Roles, 39 Permissions, 88 global RolePermissions) is excluded from synthetic inserted/skipped counters.");
        sb.AppendLine($"Inventory Consistency Check:   {(InventoryConsistencyPassed ? "PASSED" : "FAILED")}");
        sb.AppendLine($"Shelter Occupancy Check:       {(ShelterOccupancyConsistencyPassed ? "PASSED" : "FAILED")}");
        sb.AppendLine($"Foreign Key Verification:      {(ForeignKeyVerificationPassed ? "PASSED" : "FAILED")}");
        sb.AppendLine($"Overall Execution Status:      {(Succeeded ? "SUCCESS" : "FAILED")}");
        if (!string.IsNullOrWhiteSpace(ErrorMessage))
        {
            sb.AppendLine($"Error: {ErrorMessage}");
        }
        sb.AppendLine("============================================================");
        return sb.ToString();
    }
}

/// <summary>
/// Production-safe, development-only, idempotent synthetic test-data seeder.
/// Preserves all existing non-synthetic records and maintains inventory, allocation,
/// shelter occupancy, and organization-scoped RBAC invariants.
/// </summary>
public class SyntheticDataSeeder
{
    private const string SyntheticEmailDomain = "hcms.test.local";
    private const string DefaultDevSyntheticPassword = "Hcms@Synthetic2026!";

    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasherService _passwordHasher;
    private readonly IConfiguration _configuration;
    private readonly ILogger<SyntheticDataSeeder> _logger;

    public SyntheticDataSeeder(
        ApplicationDbContext context,
        IPasswordHasherService passwordHasher,
        IConfiguration configuration,
        ILogger<SyntheticDataSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<SyntheticSeedingReport> SeedAsync(
        string environmentName,
        CancellationToken cancellationToken = default)
    {
        if (!string.Equals(environmentName, "Development", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"SyntheticDataSeeder is strictly restricted to Development (current environment: '{environmentName}').");
        }

        var report = new SyntheticSeedingReport
        {
            DatabaseName = _context.Database.GetDbConnection().Database ?? "Unknown",
            EnvironmentName = environmentName
        };

        var syntheticPassword =
            _configuration["DevelopmentSeed:SyntheticPassword"] ??
            Environment.GetEnvironmentVariable("HCMS_SYNTHETIC_PASSWORD") ??
            DefaultDevSyntheticPassword;

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var baseUtc = new DateTime(2026, 11, 1, 8, 0, 0, DateTimeKind.Utc);

            // 1. Verify migration-seeded global roles & permissions exist
            var globalRoles = await _context.Roles
                .Where(r => r.OrganizationId == null && r.IsSystemDefined)
                .ToDictionaryAsync(r => r.RoleName, r => r, StringComparer.OrdinalIgnoreCase, cancellationToken);

            var permissions = await _context.Permissions
                .OrderBy(p => p.PermissionId)
                .ToListAsync(cancellationToken);

            if (globalRoles.Count < 6 || permissions.Count == 0)
            {
                throw new InvalidOperationException(
                    "Required migration-seeded global roles or permissions are missing. Run EF Core migrations first.");
            }

            // 2. Seed Users (25) + UserRoles
            var users = await SeedUsersAsync(globalRoles, syntheticPassword, baseUtc, report, cancellationToken);

            // 3. Seed Sri Lankan Geographic Hierarchy (25 Areas)
            var areas = await SeedAreasAsync(report, cancellationToken);

            // 4. Seed Organizations (10), Org Roles (10), Memberships (30), MembershipRoles (30)
            var orgs = await SeedOrganizationsAsync(baseUtc, report, cancellationToken);
            var orgRoles = await SeedOrganizationRolesAsync(orgs, permissions, report, cancellationToken);
            var memberships = await SeedOrganizationMembershipsAsync(users, orgs, baseUtc, report, cancellationToken);
            await SeedOrganizationMembershipRolesAsync(memberships, orgRoles, users, baseUtc, report, cancellationToken);

            // 5. Seed Crisis Events (15)
            var crises = await SeedCrisisEventsAsync(baseUtc, report, cancellationToken);

            // 6. Seed Resources (15), Warehouses (10), WarehouseInventories (40)
            var resources = await SeedResourcesAsync(baseUtc, report, cancellationToken);
            var warehouses = await SeedWarehousesAsync(areas, baseUtc, report, cancellationToken);
            var inventories = await SeedWarehouseInventoriesAsync(warehouses, resources, baseUtc, report, cancellationToken);

            // 7. Seed Citizen Requests (30)
            var citizenRequests = await SeedCitizenRequestsAsync(users, areas, crises, baseUtc, report, cancellationToken);

            // 8. Seed Inventory Transactions (40+) & Resource Allocations (25) with strict stock reconciliation
            await SeedInventoryLedgerAndAllocationsAsync(inventories, crises, citizenRequests, users, baseUtc, report, cancellationToken);

            // 9. Seed Donations (20)
            await SeedDonationsAsync(users, resources, warehouses, inventories, crises, baseUtc, report, cancellationToken);

            // 10. Seed Shelters (10) & Shelter Placements (20) with strict occupancy consistency
            await SeedSheltersAndPlacementsAsync(areas, citizenRequests, users, baseUtc, report, cancellationToken);

            // 11. Seed Volunteers (15) & Volunteer Assignments (20)
            await SeedVolunteersAndAssignmentsAsync(users, areas, crises, baseUtc, report, cancellationToken);

            // 12. Seed AI Recommendations (20)
            await SeedAiRecommendationsAsync(citizenRequests, crises, inventories, users, baseUtc, report, cancellationToken);

            // 13. Seed Notifications (30) & Audit Logs (30)
            await SeedNotificationsAsync(users, crises, citizenRequests, baseUtc, report, cancellationToken);
            await SeedAuditLogsAsync(users, crises, baseUtc, report, cancellationToken);

            // 14. Verify invariants before committing
            report.InventoryConsistencyPassed = await VerifyInventoryConsistencyAsync(cancellationToken);
            report.ShelterOccupancyConsistencyPassed = await VerifyShelterOccupancyConsistencyAsync(cancellationToken);
            report.ForeignKeyVerificationPassed = await VerifyForeignKeyIntegrityAsync(cancellationToken);

            if (!report.InventoryConsistencyPassed ||
                !report.ShelterOccupancyConsistencyPassed ||
                !report.ForeignKeyVerificationPassed)
            {
                throw new InvalidOperationException("Post-seeding consistency verification failed.");
            }

            await transaction.CommitAsync(cancellationToken);

            await PopulateFinalCountsAsync(report, cancellationToken);
            report.Succeeded = true;

            _logger.LogInformation(
                "Synthetic data seeding completed. Inserted={Inserted}, Skipped={Skipped}.",
                report.TotalInserted,
                report.TotalSkipped);

            return report;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            report.Succeeded = false;
            report.RecordsFailed++;
            report.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Synthetic data seeding failed and was rolled back.");
            throw;
        }
    }

    private async Task<List<User>> SeedUsersAsync(
        Dictionary<string, Role> globalRoles,
        string syntheticPassword,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var roleCycle = new[]
        {
            "Administrator", "CrisisManager", "Responder", "Donor", "Volunteer",
            "Citizen", "Citizen", "Citizen", "Citizen", "Citizen",
            "Responder", "Responder", "CrisisManager", "Donor", "Volunteer",
            "Citizen", "Citizen", "Citizen", "Citizen", "Citizen",
            "Responder", "Donor", "Volunteer", "Citizen", "Citizen"
        };

        var inserted = 0;
        var skipped = 0;
        var userRolesInserted = 0;
        var userRolesSkipped = 0;
        var result = new List<User>(25);

        for (var i = 1; i <= 25; i++)
        {
            var email = $"syn.user{i:D2}@{SyntheticEmailDomain}";
            var existing = await _context.Users
                .Include(u => u.UserRoles)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email, ct);

            if (existing != null)
            {
                skipped++;
                userRolesSkipped += existing.UserRoles.Count;
                result.Add(existing);
                continue;
            }

            var user = new User
            {
                FullName = $"Synthetic User {i:D2}",
                Email = email,
                PhoneNumber = i % 5 == 0 ? null : $"+9477100{i:D4}",
                IsActive = i <= 23, // 23 active, 2 inactive
                CreatedAt = baseUtc.AddHours(i)
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, syntheticPassword);

            var primaryRole = globalRoles[roleCycle[i - 1]];
            user.UserRoles.Add(new UserRole { User = user, RoleId = primaryRole.RoleId });
            if (!string.Equals(primaryRole.RoleName, "Citizen", StringComparison.OrdinalIgnoreCase))
            {
                user.UserRoles.Add(new UserRole { User = user, RoleId = globalRoles["Citizen"].RoleId });
            }

            _context.Users.Add(user);
            result.Add(user);
            inserted++;
            userRolesInserted += user.UserRoles.Count;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Users"] = inserted;
        report.SkippedCounts["Users"] = skipped;
        report.InsertedCounts["UserRoles"] = userRolesInserted;
        report.SkippedCounts["UserRoles"] = userRolesSkipped;
        return result;
    }

    private async Task<List<Area>> SeedAreasAsync(SyntheticSeedingReport report, CancellationToken ct)
    {
        // 3 Provinces -> 6 Districts -> 8 DS Divisions -> 8 GN Divisions = 25 Areas
        var specs = new (string Code, string Name, string Type, string? ParentCode, decimal? Lat, decimal? Lng)[]
        {
            ("SYN-PRV-WP", "Western Province [SYN]", "Province", null, 6.9271m, 79.8612m),
            ("SYN-PRV-CP", "Central Province [SYN]", "Province", null, 7.2906m, 80.6337m),
            ("SYN-PRV-SP", "Southern Province [SYN]", "Province", null, 6.0535m, 80.2210m),

            ("SYN-DST-COL", "Colombo District [SYN]", "District", "SYN-PRV-WP", 6.9271m, 79.8612m),
            ("SYN-DST-GAM", "Gampaha District [SYN]", "District", "SYN-PRV-WP", 7.0873m, 80.0144m),
            ("SYN-DST-KAL", "Kalutara District [SYN]", "District", "SYN-PRV-WP", 6.5854m, 79.9607m),
            ("SYN-DST-KDY", "Kandy District [SYN]", "District", "SYN-PRV-CP", 7.2906m, 80.6337m),
            ("SYN-DST-GAL", "Galle District [SYN]", "District", "SYN-PRV-SP", 6.0535m, 80.2210m),
            ("SYN-DST-MTR", "Matara District [SYN]", "District", "SYN-PRV-SP", 5.9549m, 80.5550m),

            ("SYN-DS-KAD", "Kaduwela DS [SYN]", "DS Division", "SYN-DST-COL", 6.9333m, 79.9833m),
            ("SYN-DS-KOL", "Kolonnawa DS [SYN]", "DS Division", "SYN-DST-COL", 6.9286m, 79.8947m),
            ("SYN-DS-NEG", "Negombo DS [SYN]", "DS Division", "SYN-DST-GAM", 7.2008m, 79.8737m),
            ("SYN-DS-BER", "Beruwala DS [SYN]", "DS Division", "SYN-DST-KAL", 6.4788m, 79.9828m),
            ("SYN-DS-PER", "Peradeniya DS [SYN]", "DS Division", "SYN-DST-KDY", 7.2699m, 80.5938m),
            ("SYN-DS-BAD", "Baddegama DS [SYN]", "DS Division", "SYN-DST-GAL", 6.1780m, 80.1740m),
            ("SYN-DS-AKU", "Akuressa DS [SYN]", "DS Division", "SYN-DST-MTR", 6.0994m, 80.4744m),
            ("SYN-DS-HOM", "Homagama DS [SYN]", "DS Division", "SYN-DST-COL", null, null),

            ("SYN-GN-01", "Malwana GN [SYN]", "GN Division", "SYN-DS-KAD", 6.9420m, 80.0080m),
            ("SYN-GN-02", "Wellampitiya GN [SYN]", "GN Division", "SYN-DS-KOL", 6.9350m, 79.8980m),
            ("SYN-GN-03", "Kochchikade GN [SYN]", "GN Division", "SYN-DS-NEG", 7.2740m, 79.8590m),
            ("SYN-GN-04", "Aluthgama GN [SYN]", "GN Division", "SYN-DS-BER", 6.4330m, 79.9990m),
            ("SYN-GN-05", "Gampola GN [SYN]", "GN Division", "SYN-DS-PER", 7.1643m, 80.5696m),
            ("SYN-GN-06", "Hikkaduwa GN [SYN]", "GN Division", "SYN-DS-BAD", 6.1395m, 80.1063m),
            ("SYN-GN-07", "Deniyaya GN [SYN]", "GN Division", "SYN-DS-AKU", 6.3422m, 80.5567m),
            ("SYN-GN-08", "Meegoda GN [SYN]", "GN Division", "SYN-DS-HOM", null, null),
        };

        var inserted = 0;
        var skipped = 0;
        var byCode = new Dictionary<string, Area>(StringComparer.OrdinalIgnoreCase);

        foreach (var s in specs)
        {
            var existing = await _context.Areas.FirstOrDefaultAsync(a => a.Code == s.Code, ct);
            if (existing != null)
            {
                skipped++;
                byCode[s.Code] = existing;
                continue;
            }

            var area = new Area
            {
                AreaName = s.Name,
                AreaType = s.Type,
                ParentAreaId = s.ParentCode != null ? byCode[s.ParentCode].AreaId : null,
                Code = s.Code,
                Latitude = s.Lat,
                Longitude = s.Lng,
                IsActive = !s.Code.EndsWith("08", StringComparison.Ordinal)
            };

            _context.Areas.Add(area);
            await _context.SaveChangesAsync(ct);
            byCode[s.Code] = area;
            inserted++;
        }

        report.InsertedCounts["Areas"] = inserted;
        report.SkippedCounts["Areas"] = skipped;
        return byCode.Values.ToList();
    }

    private async Task<List<Organization>> SeedOrganizationsAsync(
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var coords = new (decimal? Lat, decimal? Lng)[]
        {
            (6.9271m, 79.8612m), (7.2906m, 80.6337m), (6.0535m, 80.2210m), (6.5854m, 79.9607m),
            (7.0873m, 80.0144m), (5.9549m, 80.5550m), (7.4863m, 80.3623m), (6.7056m, 80.3847m),
            (null, null), (null, null)
        };
        var types = new[] { "NGO", "Government Department", "Hospital", "Relief Partner", "Volunteer Network" };

        var inserted = 0;
        var skipped = 0;
        var result = new List<Organization>(10);

        for (var i = 1; i <= 10; i++)
        {
            var regNo = $"SYN-ORG-{i:D3}";
            var existing = await _context.Organizations.FirstOrDefaultAsync(o => o.RegistrationNumber == regNo, ct);
            if (existing != null)
            {
                skipped++;
                result.Add(existing);
                continue;
            }

            var org = new Organization
            {
                OrganizationName = $"Synthetic Relief Partner {i:D2}",
                OrganizationType = types[(i - 1) % types.Length],
                RegistrationNumber = regNo,
                Description = i % 4 == 0 ? null : $"Synthetic humanitarian response organization #{i:D2}.",
                Email = $"org{i:D2}@{SyntheticEmailDomain}",
                PhoneNumber = i % 3 == 0 ? null : $"+9411250{i:D4}",
                Address = $"No. {i * 10}, Relief Avenue, Sri Lanka",
                Latitude = coords[i - 1].Lat,
                Longitude = coords[i - 1].Lng,
                IsActive = i <= 8, // 8 active, 2 inactive
                CreatedAt = baseUtc.AddDays(i)
            };

            _context.Organizations.Add(org);
            result.Add(org);
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Organizations"] = inserted;
        report.SkippedCounts["Organizations"] = skipped;
        return result;
    }

    private async Task<List<Role>> SeedOrganizationRolesAsync(
        List<Organization> orgs,
        List<Permission> permissions,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var roleSpecs = new[]
        {
            ("OrganizationAdmin", "Organization-scoped coordinator"),
            ("LogisticsCoordinator", "Manages warehouse stock and allocations")
        };

        var validPerms = permissions
            .Where(p => p.PermissionName is "Organizations.View" or "Organizations.Manage"
                or "Organizations.ApproveMembers" or "Resources.View" or "Resources.Manage"
                or "Resources.Allocate" or "Reports.View")
            .ToList();

        var inserted = 0;
        var skipped = 0;
        var rolePermInserted = 0;
        var rolePermSkipped = 0;
        var result = new List<Role>();

        // 2 org-scoped roles for first 5 active organizations = 10 org-scoped roles
        foreach (var org in orgs.Where(o => o.IsActive).Take(5))
        {
            foreach (var (roleName, desc) in roleSpecs)
            {
                var existing = await _context.Roles
                    .Include(r => r.RolePermissions)
                    .FirstOrDefaultAsync(r => r.OrganizationId == org.OrganizationId && r.RoleName == roleName, ct);

                if (existing != null)
                {
                    skipped++;
                    rolePermSkipped += existing.RolePermissions.Count;
                    result.Add(existing);
                    continue;
                }

                var role = new Role
                {
                    RoleName = roleName,
                    Description = desc,
                    OrganizationId = org.OrganizationId,
                    IsSystemDefined = false
                };

                var permsForRole = roleName == "OrganizationAdmin"
                    ? validPerms
                    : validPerms.Where(p => p.PermissionName.StartsWith("Resources.", StringComparison.Ordinal)).ToList();

                foreach (var perm in permsForRole)
                {
                    role.RolePermissions.Add(new RolePermission { Role = role, PermissionId = perm.PermissionId });
                }

                _context.Roles.Add(role);
                result.Add(role);
                inserted++;
                rolePermInserted += role.RolePermissions.Count;
            }
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["OrganizationRoles"] = inserted;
        report.SkippedCounts["OrganizationRoles"] = skipped;
        report.InsertedCounts["OrganizationRolePermissions"] = rolePermInserted;
        report.SkippedCounts["OrganizationRolePermissions"] = rolePermSkipped;
        return result;
    }

    private async Task<List<OrganizationMembership>> SeedOrganizationMembershipsAsync(
        List<User> users,
        List<Organization> orgs,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var activeUsers = users.Where(u => u.IsActive).ToList();
        var activeOrgs = orgs.Where(o => o.IsActive).Take(5).ToList();
        var approver = activeUsers.First();

        var inserted = 0;
        var skipped = 0;
        var result = new List<OrganizationMembership>(30);

        // 30 unique (UserId, OrganizationId) memberships: 6 users x 5 active orgs
        for (var uIdx = 0; uIdx < 6; uIdx++)
        {
            for (var oIdx = 0; oIdx < 5; oIdx++)
            {
                var user = activeUsers[uIdx + 1]; // skip user01 (approver)
                var org = activeOrgs[oIdx];
                var seq = uIdx * 5 + oIdx + 1;

                var existing = await _context.OrganizationMemberships
                    .FirstOrDefaultAsync(m => m.UserId == user.UserId && m.OrganizationId == org.OrganizationId, ct);

                if (existing != null)
                {
                    skipped++;
                    result.Add(existing);
                    continue;
                }

                // 24 Approved, 4 Pending, 2 Rejected
                var status = seq <= 24 ? "Approved" : seq <= 28 ? "Pending" : "Rejected";
                var membership = new OrganizationMembership
                {
                    UserId = user.UserId,
                    OrganizationId = org.OrganizationId,
                    MembershipStatus = status,
                    JoinedAt = baseUtc.AddHours(seq),
                    ApprovedAt = status == "Approved" ? baseUtc.AddHours(seq + 1) : null,
                    ApprovedByUserId = status == "Approved" ? approver.UserId : null
                };

                _context.OrganizationMemberships.Add(membership);
                result.Add(membership);
                inserted++;
            }
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["OrganizationMemberships"] = inserted;
        report.SkippedCounts["OrganizationMemberships"] = skipped;
        return result;
    }

    private async Task SeedOrganizationMembershipRolesAsync(
        List<OrganizationMembership> memberships,
        List<Role> orgRoles,
        List<User> users,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var assigner = users.First(u => u.IsActive);
        var approvedMemberships = memberships.Where(m => m.MembershipStatus == "Approved").ToList();

        var inserted = 0;
        var skipped = 0;
        var totalPlanned = 0;

        // Assign org-scoped roles strictly to Approved memberships of active orgs/users (30 total assignments)
        foreach (var membership in approvedMemberships)
        {
            var matchingOrgRoles = orgRoles
                .Where(r => r.OrganizationId == membership.OrganizationId && !r.IsSystemDefined)
                .ToList();

            foreach (var role in matchingOrgRoles)
            {
                if (totalPlanned >= 30) break;
                totalPlanned++;

                var exists = await _context.OrganizationMembershipRoles
                    .AnyAsync(mr => mr.MembershipId == membership.MembershipId && mr.RoleId == role.RoleId, ct);

                if (exists)
                {
                    skipped++;
                    continue;
                }

                _context.OrganizationMembershipRoles.Add(new OrganizationMembershipRole
                {
                    MembershipId = membership.MembershipId,
                    OrganizationId = membership.OrganizationId,
                    RoleId = role.RoleId,
                    AssignedAt = baseUtc.AddDays(1),
                    AssignedByUserId = assigner.UserId
                });
                inserted++;
            }
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["OrganizationMembershipRoles"] = inserted;
        report.SkippedCounts["OrganizationMembershipRoles"] = skipped;
    }

    private async Task<List<CrisisEvent>> SeedCrisisEventsAsync(
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var statuses = new[] { "Active", "Active", "Reported", "Resolved", "Closed" };
        var severities = new[] { "Critical", "High", "Medium", "Low" };
        var types = new[] { "Flood", "Landslide", "Cyclone", "Drought", "Health Emergency" };
        var locations = new (string? Name, decimal? Lat, decimal? Lng)[]
        {
            ("Kelani Basin, Colombo", 6.9420m, 79.9200m),
            ("Kalutara Riverfront", 6.5854m, 79.9607m),
            ("Peradeniya, Kandy", 7.2699m, 80.5938m),
            ("Baddegama, Galle", 6.1780m, 80.1740m),
            ("Akuressa, Matara", 6.0994m, 80.4744m),
            ("Negombo Lagoon", 7.2008m, 79.8737m),
            ("Ratnapura Hills", 6.7056m, 80.3847m),
            ("Kurunegala Plains", 7.4863m, 80.3623m),
            ("Gampola Valley", 7.1643m, 80.5696m),
            ("Beruwala Coast", 6.4788m, 79.9828m),
            ("Hikkaduwa Shore", 6.1395m, 80.1063m),
            ("Deniyaya Slope", 6.3422m, 80.5567m),
            ("Kolonnawa Canal", 6.9286m, 79.8947m),
            (null, null, null),
            ("Regional Standby Zone", null, null)
        };

        var inserted = 0;
        var skipped = 0;
        var result = new List<CrisisEvent>(15);

        for (var i = 1; i <= 15; i++)
        {
            var name = $"[SYN-CRISIS-{i:D2}] {types[(i - 1) % types.Length]} Response";
            var existing = await _context.CrisisEvents.FirstOrDefaultAsync(c => c.CrisisName == name, ct);
            if (existing != null)
            {
                skipped++;
                result.Add(existing);
                continue;
            }

            var crisis = new CrisisEvent
            {
                CrisisName = name,
                CrisisType = types[(i - 1) % types.Length],
                Description = $"Synthetic crisis scenario #{i:D2} for automated and UAT testing.",
                SeverityLevel = severities[(i - 1) % severities.Length],
                StartDate = baseUtc.AddDays(-15 + i),
                Status = statuses[(i - 1) % statuses.Length],
                LocationName = locations[i - 1].Name,
                Latitude = locations[i - 1].Lat,
                Longitude = locations[i - 1].Lng
            };

            _context.CrisisEvents.Add(crisis);
            result.Add(crisis);
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["CrisisEvents"] = inserted;
        report.SkippedCounts["CrisisEvents"] = skipped;
        return result;
    }

    private async Task<List<Resource>> SeedResourcesAsync(
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var specs = new (string Name, string Cat, string Unit, bool Perishable, bool Active)[]
        {
            ("[SYN] Drinking Water 5L", "Water", "Bottles", false, true),
            ("[SYN] Dry Rations Pack", "Food", "Packs", true, true),
            ("[SYN] Emergency Medical Kit", "Medicine", "Kits", true, true),
            ("[SYN] Family Relief Tent", "Shelter", "Units", false, true),
            ("[SYN] Thermal Blanket", "Clothing", "Units", false, true),
            ("[SYN] Oral Rehydration Salts", "Medicine", "Boxes", true, true),
            ("[SYN] Infant Formula Pack", "Food", "Tins", true, true),
            ("[SYN] Solar Lantern", "Equipment", "Units", false, true),
            ("[SYN] Water Purification Tablets", "Water", "Strips", false, true),
            ("[SYN] Hygiene Kit", "Sanitation", "Kits", false, true),
            ("[SYN] Mosquito Net", "Shelter", "Units", false, true),
            ("[SYN] Portable Generator Fuel", "Fuel", "Liters", false, true),
            ("[SYN] Emergency Rice 10kg", "Food", "Bags", true, true),
            ("[SYN] First Aid Bandages", "Medicine", "Rolls", false, true),
            ("[SYN] Legacy Standby Ration", "Food", "Packs", true, false),
        };

        var inserted = 0;
        var skipped = 0;
        var result = new List<Resource>(15);

        for (var i = 0; i < specs.Length; i++)
        {
            var s = specs[i];
            var existing = await _context.Resources.FirstOrDefaultAsync(r => r.ResourceName == s.Name, ct);
            if (existing != null)
            {
                skipped++;
                result.Add(existing);
                continue;
            }

            var res = new Resource
            {
                ResourceName = s.Name,
                ResourceCategory = s.Cat,
                Description = i % 3 == 0 ? null : $"Synthetic relief supply item: {s.Name}",
                UnitOfMeasure = s.Unit,
                IsPerishable = s.Perishable,
                IsActive = s.Active,
                CreatedAt = baseUtc.AddHours(i)
            };

            _context.Resources.Add(res);
            result.Add(res);
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Resources"] = inserted;
        report.SkippedCounts["Resources"] = skipped;
        return result;
    }

    private async Task<List<Warehouse>> SeedWarehousesAsync(
        List<Area> areas,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var activeAreas = areas.Where(a => a.IsActive).ToList();
        var coords = new (decimal? Lat, decimal? Lng)[]
        {
            (6.9333m, 79.9833m), (6.9286m, 79.8947m), (7.2008m, 79.8737m), (6.4788m, 79.9828m),
            (7.2699m, 80.5938m), (6.1780m, 80.1740m), (6.0994m, 80.4744m), (7.0873m, 80.0144m),
            (null, null), (null, null)
        };

        var inserted = 0;
        var skipped = 0;
        var result = new List<Warehouse>(10);

        for (var i = 1; i <= 10; i++)
        {
            var code = $"WH-SYN-{i:D2}";
            var existing = await _context.Warehouses.FirstOrDefaultAsync(w => w.WarehouseCode == code, ct);
            if (existing != null)
            {
                skipped++;
                result.Add(existing);
                continue;
            }

            var area = activeAreas[(i - 1) % activeAreas.Count];
            var wh = new Warehouse
            {
                WarehouseName = $"Synthetic Logistics Depot {i:D2}",
                WarehouseCode = code,
                Description = i % 3 == 0 ? null : $"Regional relief storage facility #{i:D2}.",
                Address = $"Depot Road {i * 5}, {area.AreaName}",
                Latitude = coords[i - 1].Lat,
                Longitude = coords[i - 1].Lng,
                AreaId = area.AreaId,
                ContactPerson = i % 4 == 0 ? null : $"Depot Manager {i:D2}",
                ContactNumber = i % 4 == 0 ? null : $"+9411300{i:D4}",
                IsActive = i <= 9,
                CreatedAt = baseUtc.AddHours(i)
            };

            _context.Warehouses.Add(wh);
            result.Add(wh);
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Warehouses"] = inserted;
        report.SkippedCounts["Warehouses"] = skipped;
        return result;
    }

    private async Task<List<WarehouseInventory>> SeedWarehouseInventoriesAsync(
        List<Warehouse> warehouses,
        List<Resource> resources,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var activeWarehouses = warehouses.Where(w => w.IsActive).ToList();
        var activeResources = resources.Where(r => r.IsActive).ToList();

        var inserted = 0;
        var skipped = 0;
        var result = new List<WarehouseInventory>(40);

        // 40 unique (WarehouseId, ResourceId) combinations
        var count = 0;
        for (var w = 0; w < activeWarehouses.Count && count < 40; w++)
        {
            for (var r = 0; r < activeResources.Count && count < 40; r++)
            {
                if ((w + r) % 3 != 0 && count >= 30) continue;
                count++;

                var wh = activeWarehouses[w];
                var res = activeResources[r];

                var existing = await _context.WarehouseInventories
                    .FirstOrDefaultAsync(i => i.WarehouseId == wh.WarehouseId && i.ResourceId == res.ResourceId, ct);

                if (existing != null)
                {
                    skipped++;
                    result.Add(existing);
                    continue;
                }

                // Initial stock before ledger transactions
                var initialQty = 500m + (count * 25m);
                var reorder = count % 5 == 0 ? 600m : 100m; // some low-stock scenarios

                var inv = new WarehouseInventory
                {
                    WarehouseId = wh.WarehouseId,
                    ResourceId = res.ResourceId,
                    QuantityAvailable = initialQty,
                    ReorderLevel = reorder,
                    LastUpdatedAt = baseUtc.AddHours(count)
                };

                _context.WarehouseInventories.Add(inv);
                result.Add(inv);
                inserted++;
            }
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["WarehouseInventories"] = inserted;
        report.SkippedCounts["WarehouseInventories"] = skipped;
        return result;
    }

    private async Task<List<CitizenRequest>> SeedCitizenRequestsAsync(
        List<User> users,
        List<Area> areas,
        List<CrisisEvent> crises,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var requestTypes = new[] { "Food", "Water", "Medicine", "Shelter", "Transport", "Other" };
        var urgencies = new[] { "Low", "Medium", "High", "Critical" };
        var statuses = new[] { "Pending", "Verified", "Assigned", "Fulfilled", "Rejected" };
        var activeAreas = areas.Where(a => a.IsActive && a.Latitude.HasValue).ToList();

        var inserted = 0;
        var skipped = 0;
        var result = new List<CitizenRequest>(30);

        for (var i = 1; i <= 30; i++)
        {
            var marker = $"[SYN-REQ-{i:D2}]";
            var existing = await _context.CitizenRequests.FirstOrDefaultAsync(r => r.Description.StartsWith(marker), ct);
            if (existing != null)
            {
                skipped++;
                result.Add(existing);
                continue;
            }

            var user = users[(i - 1) % users.Count];
            var area = activeAreas[(i - 1) % activeAreas.Count];
            var hasCoords = i % 6 != 0; // 25 geo-located, 5 null coordinates

            var req = new CitizenRequest
            {
                UserId = user.UserId,
                CrisisId = i % 4 == 0 ? null : crises[(i - 1) % crises.Count].CrisisId,
                AreaId = area.AreaId,
                RequestType = requestTypes[(i - 1) % requestTypes.Length],
                Description = $"{marker} Synthetic household emergency assistance request #{i:D2}.",
                UrgencyLevel = urgencies[(i - 1) % urgencies.Length],
                PeopleCount = ((i - 1) % 8) + 1,
                Status = statuses[(i - 1) % statuses.Length],
                Address = hasCoords ? $"{i * 12} Relief Lane, {area.AreaName}" : null,
                Latitude = hasCoords ? area.Latitude!.Value + (i * 0.002m) : null,
                Longitude = hasCoords ? area.Longitude!.Value + (i * 0.002m) : null,
                CreatedAt = baseUtc.AddHours(i),
                UpdatedAt = i % 2 == 0 ? baseUtc.AddHours(i + 2) : null
            };

            _context.CitizenRequests.Add(req);
            result.Add(req);
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["CitizenRequests"] = inserted;
        report.SkippedCounts["CitizenRequests"] = skipped;
        return result;
    }

    private async Task SeedInventoryLedgerAndAllocationsAsync(
        List<WarehouseInventory> inventories,
        List<CrisisEvent> crises,
        List<CitizenRequest> citizenRequests,
        List<User> users,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var actor = users.First(u => u.IsActive);
        var txnInserted = 0;
        var txnSkipped = 0;

        // A. Baseline StockIn / StockOut / Adjustment / Transfer pairs (40 transactions)
        // 1) 20 StockIn (baseline receipts)
        for (var i = 0; i < 20 && i < inventories.Count; i++)
        {
            var refNo = $"SYN-TXN-IN-{i + 1:D3}";
            if (await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == refNo, ct))
            {
                txnSkipped++;
                continue;
            }

            var inv = inventories[i];
            var prev = inv.QuantityAvailable;
            var qty = 100m;
            inv.QuantityAvailable = prev + qty;
            inv.LastUpdatedAt = baseUtc.AddHours(i + 1);

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryId = inv.InventoryId,
                TransactionType = InventoryTransactionType.StockIn,
                Quantity = qty,
                PreviousQuantity = prev,
                NewQuantity = inv.QuantityAvailable,
                ReferenceNumber = refNo,
                Notes = "Synthetic baseline stock receipt.",
                PerformedByUserId = actor.UserId,
                CreatedAt = baseUtc.AddHours(i + 1)
            });
            txnInserted++;
        }

        // 2) 6 StockOut
        for (var i = 0; i < 6; i++)
        {
            var refNo = $"SYN-TXN-OUT-{i + 1:D3}";
            if (await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == refNo, ct))
            {
                txnSkipped++;
                continue;
            }

            var inv = inventories[i];
            var prev = inv.QuantityAvailable;
            var qty = 20m;
            inv.QuantityAvailable = prev - qty;
            inv.LastUpdatedAt = baseUtc.AddHours(30 + i);

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryId = inv.InventoryId,
                TransactionType = InventoryTransactionType.StockOut,
                Quantity = qty,
                PreviousQuantity = prev,
                NewQuantity = inv.QuantityAvailable,
                ReferenceNumber = refNo,
                Notes = "Synthetic field dispatch stock-out.",
                PerformedByUserId = actor.UserId,
                CreatedAt = baseUtc.AddHours(30 + i)
            });
            txnInserted++;
        }

        // 3) 6 Adjustments (both positive & negative signed quantities)
        for (var i = 0; i < 6; i++)
        {
            var refNo = $"SYN-TXN-ADJ-{i + 1:D3}";
            if (await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == refNo, ct))
            {
                txnSkipped++;
                continue;
            }

            var inv = inventories[6 + i];
            var prev = inv.QuantityAvailable;
            var signedQty = i % 2 == 0 ? 15m : -10m;
            inv.QuantityAvailable = prev + signedQty;
            inv.LastUpdatedAt = baseUtc.AddHours(40 + i);

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryId = inv.InventoryId,
                TransactionType = InventoryTransactionType.Adjustment,
                Quantity = signedQty,
                PreviousQuantity = prev,
                NewQuantity = inv.QuantityAvailable,
                ReferenceNumber = refNo,
                Notes = "Synthetic audit stock reconciliation adjustment.",
                PerformedByUserId = actor.UserId,
                CreatedAt = baseUtc.AddHours(40 + i)
            });
            txnInserted++;
        }

        // 4) 4 paired TransferOut + TransferIn (8 transactions sharing TransferGroupId)
        for (var i = 0; i < 4; i++)
        {
            var outRef = $"SYN-TXN-XFER-OUT-{i + 1:D3}";
            var inRef = $"SYN-TXN-XFER-IN-{i + 1:D3}";
            if (await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == outRef, ct))
            {
                txnSkipped += 2;
                continue;
            }

            var source = inventories[12 + i];
            var dest = inventories[20 + i];
            var transferQty = 30m;
            var groupId = Guid.NewGuid();

            var srcPrev = source.QuantityAvailable;
            source.QuantityAvailable = srcPrev - transferQty;
            source.LastUpdatedAt = baseUtc.AddHours(50 + i);

            var dstPrev = dest.QuantityAvailable;
            dest.QuantityAvailable = dstPrev + transferQty;
            dest.LastUpdatedAt = baseUtc.AddHours(50 + i);

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryId = source.InventoryId,
                TransactionType = InventoryTransactionType.TransferOut,
                Quantity = transferQty,
                PreviousQuantity = srcPrev,
                NewQuantity = source.QuantityAvailable,
                ReferenceNumber = outRef,
                Notes = $"Synthetic inter-warehouse transfer out to inventory #{dest.InventoryId}.",
                PerformedByUserId = actor.UserId,
                TransferGroupId = groupId,
                CreatedAt = baseUtc.AddHours(50 + i)
            });
            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                InventoryId = dest.InventoryId,
                TransactionType = InventoryTransactionType.TransferIn,
                Quantity = transferQty,
                PreviousQuantity = dstPrev,
                NewQuantity = dest.QuantityAvailable,
                ReferenceNumber = inRef,
                Notes = $"Synthetic inter-warehouse transfer in from inventory #{source.InventoryId}.",
                PerformedByUserId = actor.UserId,
                TransferGroupId = groupId,
                CreatedAt = baseUtc.AddHours(50 + i)
            });
            txnInserted += 2;
        }

        await _context.SaveChangesAsync(ct);

        // B. Resource Allocations (25) covering all 6 statuses with consistent stock deductions
        var allocationStatuses = new[]
        {
            ResourceAllocationStatus.Pending,
            ResourceAllocationStatus.Approved,
            ResourceAllocationStatus.Dispatched,
            ResourceAllocationStatus.Delivered,
            ResourceAllocationStatus.Rejected,
            ResourceAllocationStatus.Cancelled
        };

        var allocInserted = 0;
        var allocSkipped = 0;
        var activeCrises = crises.Where(c => c.Status != "Closed" && c.Status != "Resolved").ToList();

        for (var i = 1; i <= 25; i++)
        {
            var refNo = $"SYN-ALLOC-{i:D3}";
            var existingAlloc = await _context.ResourceAllocations.FirstOrDefaultAsync(a => a.ReferenceNumber == refNo, ct);
            if (existingAlloc != null)
            {
                allocSkipped++;
                if (existingAlloc.Status is ResourceAllocationStatus.Dispatched or ResourceAllocationStatus.Delivered)
                {
                    var existingTxnRef = $"SYN-TXN-ALLOC-{i:D3}";
                    if (await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == existingTxnRef, ct))
                    {
                        txnSkipped++;
                    }
                }
                continue;
            }

            var status = allocationStatuses[(i - 1) % allocationStatuses.Length];
            var inv = inventories[(i - 1) % inventories.Count];
            var crisis = activeCrises[(i - 1) % activeCrises.Count];
            var reqQty = 25m;
            var allocQty = status is ResourceAllocationStatus.Approved or ResourceAllocationStatus.Dispatched or ResourceAllocationStatus.Delivered
                ? 20m
                : 0m;

            var allocation = new ResourceAllocation
            {
                InventoryId = inv.InventoryId,
                CrisisId = crisis.CrisisId,
                CitizenRequestId = i % 2 == 0 ? citizenRequests[(i - 1) % citizenRequests.Count].RequestId : null,
                QuantityRequested = reqQty,
                QuantityAllocated = allocQty,
                Status = status,
                RequestedByUserId = actor.UserId,
                ApprovedByUserId = status != ResourceAllocationStatus.Pending ? actor.UserId : null,
                ReferenceNumber = refNo,
                Notes = $"Synthetic resource allocation ({status}).",
                CreatedAt = baseUtc.AddHours(60 + i),
                UpdatedAt = status != ResourceAllocationStatus.Pending ? baseUtc.AddHours(62 + i) : null
            };
            _context.ResourceAllocations.Add(allocation);
            allocInserted++;

            // Dispatched & Delivered allocations must deduct stock via a matching StockOut transaction
            if (status is ResourceAllocationStatus.Dispatched or ResourceAllocationStatus.Delivered)
            {
                var txnRef = $"SYN-TXN-ALLOC-{i:D3}";
                if (!await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == txnRef, ct))
                {
                    var prev = inv.QuantityAvailable;
                    inv.QuantityAvailable = prev - allocQty;
                    inv.LastUpdatedAt = baseUtc.AddHours(63 + i);

                    _context.InventoryTransactions.Add(new InventoryTransaction
                    {
                        InventoryId = inv.InventoryId,
                        TransactionType = InventoryTransactionType.StockOut,
                        Quantity = allocQty,
                        PreviousQuantity = prev,
                        NewQuantity = inv.QuantityAvailable,
                        ReferenceNumber = txnRef,
                        Notes = $"Dispatch stock deduction for {refNo}.",
                        PerformedByUserId = actor.UserId,
                        CreatedAt = baseUtc.AddHours(63 + i)
                    });
                    txnInserted++;
                }
            }
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["InventoryTransactions"] = txnInserted;
        report.SkippedCounts["InventoryTransactions"] = txnSkipped;
        report.InsertedCounts["ResourceAllocations"] = allocInserted;
        report.SkippedCounts["ResourceAllocations"] = allocSkipped;
    }

    private async Task SeedDonationsAsync(
        List<User> users,
        List<Resource> resources,
        List<Warehouse> warehouses,
        List<WarehouseInventory> inventories,
        List<CrisisEvent> crises,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var statuses = new[] { "Pending", "Verified", "Completed", "Rejected" };
        var activeResources = resources.Where(r => r.IsActive).ToList();
        var activeWarehouses = warehouses.Where(w => w.IsActive).ToList();
        var verifier = users.First(u => u.IsActive);

        var inserted = 0;
        var skipped = 0;
        var donTxnInserted = 0;
        var donTxnSkipped = 0;

        for (var i = 1; i <= 20; i++)
        {
            var refNo = $"SYN-DON-{i:D3}";
            var existingDonation = await _context.Donations.FirstOrDefaultAsync(d => d.ReferenceNumber == refNo, ct);
            if (existingDonation != null)
            {
                skipped++;
                var existingTxnRef = $"SYN-TXN-DON-{i:D3}";
                if (await _context.InventoryTransactions.AnyAsync(t => t.ReferenceNumber == existingTxnRef, ct))
                {
                    donTxnSkipped++;
                }
                continue;
            }

            var isMonetary = i % 2 == 1;
            var status = statuses[(i - 1) % statuses.Length];
            var isVerifiedOrCompleted = status is "Verified" or "Completed";

            int? txnId = null;
            int? resId = null;
            int? whId = null;
            decimal? qty = null;

            if (!isMonetary)
            {
                var inv = inventories[(i - 1) % inventories.Count];
                resId = inv.ResourceId;
                whId = inv.WarehouseId;
                qty = 15m;

                if (isVerifiedOrCompleted)
                {
                    var prev = inv.QuantityAvailable;
                    inv.QuantityAvailable = prev + qty.Value;
                    inv.LastUpdatedAt = baseUtc.AddHours(90 + i);

                    var txn = new InventoryTransaction
                    {
                        InventoryId = inv.InventoryId,
                        TransactionType = InventoryTransactionType.StockIn,
                        Quantity = qty.Value,
                        PreviousQuantity = prev,
                        NewQuantity = inv.QuantityAvailable,
                        ReferenceNumber = $"SYN-TXN-DON-{i:D3}",
                        Notes = $"Verified resource donation {refNo}.",
                        PerformedByUserId = verifier.UserId,
                        CreatedAt = baseUtc.AddHours(90 + i)
                    };
                    _context.InventoryTransactions.Add(txn);
                    await _context.SaveChangesAsync(ct);
                    txnId = txn.InventoryTransactionId;
                    donTxnInserted++;
                }
            }

            _context.Donations.Add(new Donation
            {
                DonorName = $"Synthetic Donor {i:D2}",
                DonorEmail = i % 3 == 0 ? null : $"donor{i:D2}@{SyntheticEmailDomain}",
                DonorPhone = i % 4 == 0 ? null : $"+9477200{i:D4}",
                DonorUserId = users[(i - 1) % users.Count].UserId,
                DonationType = isMonetary ? "Monetary" : "Resource",
                Amount = isMonetary ? 25000m * ((i % 5) + 1) : null,
                Currency = "LKR",
                ResourceId = resId,
                WarehouseId = whId,
                Quantity = qty,
                InventoryTransactionId = txnId,
                CrisisId = i % 3 == 0 ? null : crises[(i - 1) % crises.Count].CrisisId,
                ReferenceNumber = refNo,
                Status = status,
                VerifiedByUserId = isVerifiedOrCompleted ? verifier.UserId : null,
                VerifiedAt = isVerifiedOrCompleted ? baseUtc.AddHours(91 + i) : null,
                Notes = i % 5 == 0 ? null : $"Synthetic {(isMonetary ? "monetary" : "resource")} contribution #{i:D2}.",
                CreatedAt = baseUtc.AddHours(88 + i),
                UpdatedAt = isVerifiedOrCompleted ? baseUtc.AddHours(91 + i) : null
            });
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["InventoryTransactions"] =
            report.InsertedCounts.GetValueOrDefault("InventoryTransactions") + donTxnInserted;
        report.SkippedCounts["InventoryTransactions"] =
            report.SkippedCounts.GetValueOrDefault("InventoryTransactions") + donTxnSkipped;
        report.InsertedCounts["Donations"] = inserted;
        report.SkippedCounts["Donations"] = skipped;
    }

    private async Task SeedSheltersAndPlacementsAsync(
        List<Area> areas,
        List<CitizenRequest> citizenRequests,
        List<User> users,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var activeAreas = areas.Where(a => a.IsActive && a.Latitude.HasValue).ToList();
        var assigner = users.First(u => u.IsActive);

        // 10 shelters: 6 Open (2 will become Full after active placements), 2 Closed, 2 Maintenance
        var shelterDefs = new (string Name, int Cap, string InitialStatus, bool WithCoords)[]
        {
            ("[SYN] Malwana Relief Center", 100, "Open", true),
            ("[SYN] Wellampitiya School Shelter", 20, "Open", true),  // will be filled to Full (20/20)
            ("[SYN] Negombo Community Hall", 80, "Open", true),
            ("[SYN] Beruwala Relief Camp", 15, "Open", true),         // will be filled to Full (15/15)
            ("[SYN] Peradeniya Hall", 120, "Open", true),
            ("[SYN] Hikkaduwa Shelter", 90, "Open", false),
            ("[SYN] Old Depot Shelter", 60, "Closed", true),
            ("[SYN] Coastal Annex Shelter", 50, "Closed", false),
            ("[SYN] Gampola Civic Center", 75, "Maintenance", true),
            ("[SYN] Akuressa Pavilion", 70, "Maintenance", true),
        };

        var shelterInserted = 0;
        var shelterSkipped = 0;
        var shelters = new List<Shelter>(10);

        for (var i = 0; i < shelterDefs.Length; i++)
        {
            var def = shelterDefs[i];
            var existing = await _context.Shelters.FirstOrDefaultAsync(s => s.ShelterName == def.Name, ct);
            if (existing != null)
            {
                shelterSkipped++;
                shelters.Add(existing);
                continue;
            }

            var area = activeAreas[i % activeAreas.Count];
            var shelter = new Shelter
            {
                ShelterName = def.Name,
                AreaId = area.AreaId,
                Address = $"Shelter Site {i + 1}, {area.AreaName}",
                Latitude = def.WithCoords ? area.Latitude!.Value + (i * 0.003m) : null,
                Longitude = def.WithCoords ? area.Longitude!.Value + (i * 0.003m) : null,
                Capacity = def.Cap,
                CurrentOccupancy = 0,
                Status = def.InitialStatus,
                ContactName = $"Warden {i + 1:D2}",
                ContactPhone = $"+9471400{i + 1:D4}",
                Facilities = "Water, First Aid, Bedding",
                IsActive = def.InitialStatus != "Closed",
                CreatedAt = baseUtc.AddHours(i)
            };

            _context.Shelters.Add(shelter);
            shelters.Add(shelter);
            shelterInserted++;
        }

        await _context.SaveChangesAsync(ct);

        // 20 placements across the 6 open shelters (index 0..5), strictly keeping CurrentOccupancy <= Capacity
        var placementSpecs = new (int ShelterIdx, int People, string Status)[]
        {
            (0, 12, "Active"), (0, 8, "Active"), (0, 5, "CheckedOut"),
            (1, 10, "Active"), (1, 10, "Active"), // 20/20 -> Full
            (2, 15, "Active"), (2, 10, "Active"), (2, 6, "CheckedOut"),
            (3, 8, "Active"), (3, 7, "Active"),   // 15/15 -> Full
            (4, 20, "Active"), (4, 15, "Active"), (4, 9, "CheckedOut"),
            (5, 14, "Active"), (5, 11, "Active"), (5, 4, "CheckedOut"),
            (0, 6, "Active"), (2, 7, "Active"), (4, 10, "CheckedOut"), (5, 5, "CheckedOut")
        };

        var placeInserted = 0;
        var placeSkipped = 0;

        for (var i = 0; i < placementSpecs.Length; i++)
        {
            var spec = placementSpecs[i];
            var residentName = $"[SYN-RESIDENT-{i + 1:D2}] Household";
            if (await _context.ShelterPlacements.AnyAsync(p => p.ResidentName == residentName, ct))
            {
                placeSkipped++;
                continue;
            }

            var shelter = shelters[spec.ShelterIdx];
            if (spec.Status == "Active")
            {
                shelter.CurrentOccupancy += spec.People;
                if (shelter.CurrentOccupancy >= shelter.Capacity)
                {
                    shelter.Status = "Full";
                }
                shelter.UpdatedAt = baseUtc.AddHours(100 + i);
            }

            _context.ShelterPlacements.Add(new ShelterPlacement
            {
                ShelterId = shelter.ShelterId,
                CitizenRequestId = i % 2 == 0 ? citizenRequests[i % citizenRequests.Count].RequestId : null,
                ResidentName = residentName,
                PeopleCount = spec.People,
                Status = spec.Status,
                Notes = spec.Status == "CheckedOut" ? "Synthetic resident checked out safely." : "Synthetic active placement.",
                AssignedByUserId = i % 5 == 0 ? null : assigner.UserId,
                CheckedInAt = baseUtc.AddHours(95 + i),
                CheckedOutAt = spec.Status == "CheckedOut" ? baseUtc.AddHours(110 + i) : null
            });
            placeInserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Shelters"] = shelterInserted;
        report.SkippedCounts["Shelters"] = shelterSkipped;
        report.InsertedCounts["ShelterPlacements"] = placeInserted;
        report.SkippedCounts["ShelterPlacements"] = placeSkipped;
    }

    private async Task SeedVolunteersAndAssignmentsAsync(
        List<User> users,
        List<Area> areas,
        List<CrisisEvent> crises,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var activeAreas = areas.Where(a => a.IsActive).ToList();
        var assigner = users.First(u => u.IsActive);
        var skillsList = new[]
        {
            "First Aid, Search & Rescue",
            "Logistics, Heavy Vehicle Driving",
            "Medical Triage, Nursing",
            "Water Sanitation, Shelter Setup",
            "Multilingual Coordination (SI/TA/EN)"
        };

        // 15 Volunteers covering Approved/Pending/Rejected and Available/Deployed/Unavailable
        var volSpecs = new (string Avail, string Approval, bool Active)[]
        {
            ("Available", "Approved", true), ("Available", "Approved", true), ("Available", "Approved", true),
            ("Deployed", "Approved", true), ("Deployed", "Approved", true), ("Deployed", "Approved", true),
            ("Available", "Approved", true), ("Available", "Approved", true), ("Available", "Approved", true),
            ("Unavailable", "Approved", true),
            ("Available", "Pending", true), ("Available", "Pending", true),
            ("Available", "Rejected", true), ("Unavailable", "Rejected", false),
            ("Available", "Pending", true)
        };

        var volInserted = 0;
        var volSkipped = 0;
        var volunteers = new List<Volunteer>(15);

        for (var i = 1; i <= 15; i++)
        {
            var email = $"syn.vol{i:D2}@{SyntheticEmailDomain}";
            var existing = await _context.Volunteers.FirstOrDefaultAsync(v => v.Email == email, ct);
            if (existing != null)
            {
                volSkipped++;
                volunteers.Add(existing);
                continue;
            }

            var spec = volSpecs[i - 1];
            var vol = new Volunteer
            {
                UserId = i <= 10 ? users[i % users.Count].UserId : null,
                FullName = $"Synthetic Volunteer {i:D2}",
                Email = email,
                PhoneNumber = i % 4 == 0 ? null : $"+9477500{i:D4}",
                AreaId = i % 5 == 0 ? null : activeAreas[(i - 1) % activeAreas.Count].AreaId,
                Skills = skillsList[(i - 1) % skillsList.Length],
                AvailabilityStatus = spec.Avail,
                ApprovalStatus = spec.Approval,
                IsActive = spec.Active,
                CreatedAt = baseUtc.AddHours(i)
            };

            _context.Volunteers.Add(vol);
            volunteers.Add(vol);
            volInserted++;
        }

        await _context.SaveChangesAsync(ct);

        // 20 Volunteer Assignments strictly for active, Approved, non-Unavailable volunteers
        var eligibleVolunteers = volunteers
            .Where(v => v.IsActive && v.ApprovalStatus == "Approved" && v.AvailabilityStatus != "Unavailable")
            .ToList();
        var assignmentStatuses = new[] { "Assigned", "Active", "Completed", "Cancelled" };
        var assignInserted = 0;
        var assignSkipped = 0;

        for (var i = 1; i <= 20; i++)
        {
            var roleTitle = $"[SYN-ASSIGN-{i:D2}] Field Response";
            if (await _context.VolunteerAssignments.AnyAsync(a => a.RoleTitle == roleTitle, ct))
            {
                assignSkipped++;
                continue;
            }

            var vol = eligibleVolunteers[(i - 1) % eligibleVolunteers.Count];
            var crisis = crises[(i - 1) % crises.Count];
            var status = assignmentStatuses[(i - 1) % assignmentStatuses.Length];

            _context.VolunteerAssignments.Add(new VolunteerAssignment
            {
                VolunteerId = vol.VolunteerId,
                CrisisId = crisis.CrisisId,
                RoleTitle = roleTitle,
                TaskDescription = $"Synthetic field support deployment #{i:D2}.",
                Status = status,
                AssignedByUserId = assigner.UserId,
                AssignedAt = baseUtc.AddHours(120 + i),
                CompletedAt = status == "Completed" ? baseUtc.AddHours(135 + i) : null,
                Notes = i % 3 == 0 ? null : $"Deployment note #{i:D2}."
            });
            assignInserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Volunteers"] = volInserted;
        report.SkippedCounts["Volunteers"] = volSkipped;
        report.InsertedCounts["VolunteerAssignments"] = assignInserted;
        report.SkippedCounts["VolunteerAssignments"] = assignSkipped;
    }

    private async Task SeedAiRecommendationsAsync(
        List<CitizenRequest> citizenRequests,
        List<CrisisEvent> crises,
        List<WarehouseInventory> inventories,
        List<User> users,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var reviewer = users.First(u => u.IsActive);
        var reviewStatuses = new[]
        {
            AiRecommendationReviewStatus.PendingReview,
            AiRecommendationReviewStatus.Approved,
            AiRecommendationReviewStatus.Overridden,
            AiRecommendationReviewStatus.Rejected
        };
        var urgencies = new[] { "Low", "Medium", "High", "Critical" };
        var categories = new[] { "Food", "Water", "Medicine", "Shelter", "Transport" };

        var inserted = 0;
        var skipped = 0;

        for (var i = 1; i <= 20; i++)
        {
            var req = citizenRequests[(i - 1) % citizenRequests.Count];
            var marker = $"[SYN-AI-{i:D2}]";
            if (await _context.AiRecommendations.AnyAsync(a => a.Explanation.StartsWith(marker), ct))
            {
                skipped++;
                continue;
            }

            var reviewStatus = reviewStatuses[(i - 1) % reviewStatuses.Length];
            var isDup = i % 4 == 0;
            var dupTarget = isDup ? citizenRequests[0].RequestId : (int?)null;
            var isReviewed = reviewStatus != AiRecommendationReviewStatus.PendingReview;

            _context.AiRecommendations.Add(new AiRecommendation
            {
                CitizenRequestId = req.RequestId,
                CrisisId = req.CrisisId ?? crises[0].CrisisId,
                SuggestedCategory = categories[(i - 1) % categories.Length],
                SuggestedUrgencyLevel = urgencies[(i - 1) % urgencies.Length],
                IsPotentialDuplicate = isDup,
                DuplicateOfRequestId = dupTarget != req.RequestId ? dupTarget : null,
                SuggestedInventoryId = i % 5 == 0 ? null : inventories[(i - 1) % inventories.Count].InventoryId,
                SuggestedResourceQuantity = i % 5 == 0 ? null : 10m + i,
                ConfidenceScore = Math.Round(0.55m + ((i % 9) * 0.045m), 4),
                Explanation = $"{marker} Synthetic AI triage advisory for request #{req.RequestId}.",
                ProviderName = i % 2 == 0 ? "Groq" : "Gemini",
                ModelVersion = i % 2 == 0 ? "openai/gpt-oss-120b" : "gemini-3.1-flash-lite",
                ReviewStatus = reviewStatus,
                ReviewedByUserId = isReviewed ? reviewer.UserId : null,
                ReviewedAt = isReviewed ? baseUtc.AddHours(150 + i) : null,
                HumanDecisionNote = isReviewed ? $"Synthetic coordinator review ({reviewStatus})." : null,
                OverriddenCategory = reviewStatus == AiRecommendationReviewStatus.Overridden ? "Medicine" : null,
                OverriddenUrgencyLevel = reviewStatus == AiRecommendationReviewStatus.Overridden ? "Critical" : null,
                CreatedAt = baseUtc.AddHours(145 + i),
                UpdatedAt = isReviewed ? baseUtc.AddHours(150 + i) : null
            });
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["AiRecommendations"] = inserted;
        report.SkippedCounts["AiRecommendations"] = skipped;
    }

    private async Task SeedNotificationsAsync(
        List<User> users,
        List<CrisisEvent> crises,
        List<CitizenRequest> citizenRequests,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var categories = new[] { "Crisis", "Request", "Allocation", "Shelter", "Volunteer", "Donation", "System" };
        var severities = new[] { "Info", "Warning", "Critical", "Success" };

        var inserted = 0;
        var skipped = 0;

        for (var i = 1; i <= 30; i++)
        {
            var title = $"[SYN-NOTIF-{i:D2}] Operational Alert";
            if (await _context.Notifications.AnyAsync(n => n.Title == title, ct))
            {
                skipped++;
                continue;
            }

            var isRead = i % 2 == 0;
            _context.Notifications.Add(new Notification
            {
                UserId = users[(i - 1) % users.Count].UserId,
                Title = title,
                Message = $"Synthetic operational notification #{i:D2} for verification.",
                Category = categories[(i - 1) % categories.Length],
                Severity = severities[(i - 1) % severities.Length],
                RelatedEntityType = i % 2 == 0 ? "CrisisEvent" : "CitizenRequest",
                RelatedEntityId = i % 2 == 0
                    ? crises[(i - 1) % crises.Count].CrisisId
                    : citizenRequests[(i - 1) % citizenRequests.Count].RequestId,
                IsRead = isRead,
                ReadAt = isRead ? baseUtc.AddHours(170 + i) : null,
                CreatedAt = baseUtc.AddHours(160 + i)
            });
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["Notifications"] = inserted;
        report.SkippedCounts["Notifications"] = skipped;
    }

    private async Task SeedAuditLogsAsync(
        List<User> users,
        List<CrisisEvent> crises,
        DateTime baseUtc,
        SyntheticSeedingReport report,
        CancellationToken ct)
    {
        var actions = new[]
        {
            "CrisisEvent.Created", "CitizenRequest.Verified", "ResourceAllocation.Dispatched",
            "ShelterPlacement.CheckedIn", "Volunteer.Approved", "AiRecommendation.Reviewed"
        };
        var entityTypes = new[] { "CrisisEvent", "CitizenRequest", "ResourceAllocation", "ShelterPlacement", "Volunteer", "AiRecommendation" };

        var inserted = 0;
        var skipped = 0;

        for (var i = 1; i <= 30; i++)
        {
            var summary = $"[SYN-AUDIT-{i:D2}] Synthetic audit trail event";
            if (await _context.AuditLogs.AnyAsync(a => a.Summary == summary, ct))
            {
                skipped++;
                continue;
            }

            var actor = users[(i - 1) % users.Count];
            _context.AuditLogs.Add(new AuditLog
            {
                ActorUserId = actor.UserId,
                ActorEmail = actor.Email,
                Action = actions[(i - 1) % actions.Length],
                EntityType = entityTypes[(i - 1) % entityTypes.Length],
                EntityId = crises[(i - 1) % crises.Count].CrisisId.ToString(),
                Summary = summary,
                Status = i % 7 == 0 ? "Failed" : "Success",
                CreatedAt = baseUtc.AddHours(180 + i)
            });
            inserted++;
        }

        await _context.SaveChangesAsync(ct);
        report.InsertedCounts["AuditLogs"] = inserted;
        report.SkippedCounts["AuditLogs"] = skipped;
    }

    private async Task<bool> VerifyInventoryConsistencyAsync(CancellationToken ct)
    {
        var negativeStock = await _context.WarehouseInventories.AnyAsync(i => i.QuantityAvailable < 0, ct);
        if (negativeStock) return false;

        var txns = await _context.InventoryTransactions.AsNoTracking().ToListAsync(ct);
        foreach (var t in txns)
        {
            var expectedNew = t.TransactionType switch
            {
                InventoryTransactionType.StockIn or InventoryTransactionType.TransferIn => t.PreviousQuantity + t.Quantity,
                InventoryTransactionType.StockOut or InventoryTransactionType.TransferOut => t.PreviousQuantity - t.Quantity,
                InventoryTransactionType.Adjustment => t.PreviousQuantity + t.Quantity,
                _ => -1m
            };
            if (expectedNew != t.NewQuantity || t.NewQuantity < 0) return false;
        }

        // Verify paired transfers reconcile
        var transfers = txns.Where(t => t.TransferGroupId.HasValue).GroupBy(t => t.TransferGroupId!.Value);
        foreach (var g in transfers)
        {
            var outs = g.Where(x => x.TransactionType == InventoryTransactionType.TransferOut).Sum(x => x.Quantity);
            var ins = g.Where(x => x.TransactionType == InventoryTransactionType.TransferIn).Sum(x => x.Quantity);
            if (outs != ins || g.Count() != 2) return false;
        }

        return true;
    }

    private async Task<bool> VerifyShelterOccupancyConsistencyAsync(CancellationToken ct)
    {
        var shelters = await _context.Shelters
            .Include(s => s.Placements)
            .AsNoTracking()
            .ToListAsync(ct);

        foreach (var s in shelters)
        {
            if (s.CurrentOccupancy < 0 || s.CurrentOccupancy > s.Capacity) return false;
            var activeSum = s.Placements.Where(p => p.Status == "Active").Sum(p => p.PeopleCount);
            if (s.CurrentOccupancy != activeSum) return false;
            if (s.CurrentOccupancy == s.Capacity && s.Status != "Closed" && s.Status != "Maintenance" && s.Status != "Full")
                return false;
        }

        return true;
    }

    private async Task<bool> VerifyForeignKeyIntegrityAsync(CancellationToken ct)
    {
        // Verify no org-scoped role assigned to non-approved membership or mismatched org
        var badOrgRole = await _context.OrganizationMembershipRoles
            .Include(mr => mr.Membership)
            .Include(mr => mr.Role)
            .AnyAsync(mr =>
                mr.Membership.MembershipStatus != "Approved" ||
                mr.Role.IsSystemDefined ||
                mr.Role.OrganizationId != mr.OrganizationId, ct);

        return !badOrgRole;
    }

    private async Task PopulateFinalCountsAsync(SyntheticSeedingReport report, CancellationToken ct)
    {
        report.FinalCounts["Users"] = await _context.Users.CountAsync(ct);
        report.FinalCounts["UserRoles"] = await _context.UserRoles.CountAsync(ct);
        report.FinalCounts["Organizations"] = await _context.Organizations.CountAsync(ct);
        report.FinalCounts["OrganizationRoles"] = await _context.Roles.CountAsync(r => r.OrganizationId != null, ct);
        report.FinalCounts["OrganizationRolePermissions"] = await _context.RolePermissions.CountAsync(rp => rp.Role.OrganizationId != null, ct);
        report.FinalCounts["OrganizationMemberships"] = await _context.OrganizationMemberships.CountAsync(ct);
        report.FinalCounts["OrganizationMembershipRoles"] = await _context.OrganizationMembershipRoles.CountAsync(ct);
        report.FinalCounts["Areas"] = await _context.Areas.CountAsync(ct);
        report.FinalCounts["CrisisEvents"] = await _context.CrisisEvents.CountAsync(ct);
        report.FinalCounts["CitizenRequests"] = await _context.CitizenRequests.CountAsync(ct);
        report.FinalCounts["Resources"] = await _context.Resources.CountAsync(ct);
        report.FinalCounts["Warehouses"] = await _context.Warehouses.CountAsync(ct);
        report.FinalCounts["WarehouseInventories"] = await _context.WarehouseInventories.CountAsync(ct);
        report.FinalCounts["InventoryTransactions"] = await _context.InventoryTransactions.CountAsync(ct);
        report.FinalCounts["ResourceAllocations"] = await _context.ResourceAllocations.CountAsync(ct);
        report.FinalCounts["AiRecommendations"] = await _context.AiRecommendations.CountAsync(ct);
        report.FinalCounts["Shelters"] = await _context.Shelters.CountAsync(ct);
        report.FinalCounts["ShelterPlacements"] = await _context.ShelterPlacements.CountAsync(ct);
        report.FinalCounts["Volunteers"] = await _context.Volunteers.CountAsync(ct);
        report.FinalCounts["VolunteerAssignments"] = await _context.VolunteerAssignments.CountAsync(ct);
        report.FinalCounts["Donations"] = await _context.Donations.CountAsync(ct);
        report.FinalCounts["Notifications"] = await _context.Notifications.CountAsync(ct);
        report.FinalCounts["AuditLogs"] = await _context.AuditLogs.CountAsync(ct);
    }
}
