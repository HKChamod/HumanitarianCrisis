using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

public class SyntheticDataSeederTests
{
    private static async Task<(SqliteConnection Connection, ApplicationDbContext Context, IPasswordHasherService Hasher)> CreateIsolatedDatabaseAsync(
        bool removeSeededRoles = false)
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;

        var context = new ApplicationDbContext(options);
        await context.Database.EnsureCreatedAsync();

        if (removeSeededRoles)
        {
            context.RolePermissions.RemoveRange(context.RolePermissions);
            context.Roles.RemoveRange(context.Roles);
            await context.SaveChangesAsync();
        }

        return (connection, context, new PasswordHasherService());
    }

    private static SyntheticDataSeeder CreateSeeder(
        ApplicationDbContext context,
        IPasswordHasherService hasher)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DevelopmentSeed:SyntheticPassword"] = "Hcms@TestSeed2026!"
            })
            .Build();

        return new SyntheticDataSeeder(
            context,
            hasher,
            config,
            NullLogger<SyntheticDataSeeder>.Instance);
    }

    [Fact]
    public async Task SeedAsync_InitialRun_MeetsAllTargetCounts_Enums_And_Invariants()
    {
        var (conn, db, hasher) = await CreateIsolatedDatabaseAsync();
        await using var _ = conn;
        await using var __ = db;

        var seeder = CreateSeeder(db, hasher);
        var report = await seeder.SeedAsync("Development");

        Assert.True(report.Succeeded);
        Assert.True(report.InventoryConsistencyPassed);
        Assert.True(report.ShelterOccupancyConsistencyPassed);
        Assert.True(report.ForeignKeyVerificationPassed);

        // Target dataset minimums
        Assert.True(await db.Users.CountAsync() >= 25);
        Assert.True(await db.Organizations.CountAsync() >= 10);
        Assert.True(await db.OrganizationMemberships.CountAsync() >= 30);
        Assert.True(await db.OrganizationMembershipRoles.CountAsync() >= 30);
        Assert.True(await db.Roles.CountAsync(r => r.OrganizationId != null) >= 10);
        Assert.True(await db.Areas.CountAsync() >= 25);
        Assert.True(await db.CrisisEvents.CountAsync() >= 15);
        Assert.True(await db.CitizenRequests.CountAsync() >= 30);
        Assert.True(await db.Resources.CountAsync() >= 15);
        Assert.True(await db.Warehouses.CountAsync() >= 10);
        Assert.True(await db.WarehouseInventories.CountAsync() >= 40);
        Assert.True(await db.InventoryTransactions.CountAsync() >= 40);
        Assert.True(await db.ResourceAllocations.CountAsync() >= 25);
        Assert.True(await db.AiRecommendations.CountAsync() >= 20);
        Assert.True(await db.Shelters.CountAsync() >= 10);
        Assert.True(await db.ShelterPlacements.CountAsync() >= 20);
        Assert.True(await db.Volunteers.CountAsync() >= 15);
        Assert.True(await db.VolunteerAssignments.CountAsync() >= 20);
        Assert.True(await db.Donations.CountAsync() >= 20);
        Assert.True(await db.Notifications.CountAsync() >= 30);
        Assert.True(await db.AuditLogs.CountAsync() >= 30);

        // Enum & canonical status coverage
        var txnTypes = await db.InventoryTransactions.Select(t => t.TransactionType).Distinct().ToListAsync();
        Assert.Equal(5, txnTypes.Count);

        var allocStatuses = await db.ResourceAllocations.Select(a => a.Status).Distinct().ToListAsync();
        Assert.Equal(6, allocStatuses.Count);

        var aiStatuses = await db.AiRecommendations.Select(a => a.ReviewStatus).Distinct().ToListAsync();
        Assert.Equal(4, aiStatuses.Count);

        var crisisStatuses = await db.CrisisEvents.Select(c => c.Status).Distinct().ToListAsync();
        Assert.Contains("Reported", crisisStatuses);
        Assert.Contains("Active", crisisStatuses);
        Assert.Contains("Resolved", crisisStatuses);
        Assert.Contains("Closed", crisisStatuses);

        var shelterStatuses = await db.Shelters.Select(s => s.Status).Distinct().ToListAsync();
        Assert.Contains("Open", shelterStatuses);
        Assert.Contains("Full", shelterStatuses);
        Assert.Contains("Closed", shelterStatuses);
        Assert.Contains("Maintenance", shelterStatuses);

        // Transfer pair reconciliation
        var transferGroups = await db.InventoryTransactions
            .Where(t => t.TransferGroupId != null)
            .GroupBy(t => t.TransferGroupId!.Value)
            .ToListAsync();
        Assert.True(transferGroups.Count >= 4);
        foreach (var group in transferGroups)
        {
            Assert.Equal(2, group.Count());
            Assert.Equal(
                group.Where(x => x.TransactionType == InventoryTransactionType.TransferOut).Sum(x => x.Quantity),
                group.Where(x => x.TransactionType == InventoryTransactionType.TransferIn).Sum(x => x.Quantity));
        }

        // Dispatched/Delivered allocations have matching StockOut transactions
        var dispatchedCount = await db.ResourceAllocations
            .CountAsync(a => a.Status == ResourceAllocationStatus.Dispatched || a.Status == ResourceAllocationStatus.Delivered);
        var allocTxnCount = await db.InventoryTransactions
            .CountAsync(t => t.ReferenceNumber != null && t.ReferenceNumber.StartsWith("SYN-TXN-ALLOC-"));
        Assert.Equal(dispatchedCount, allocTxnCount);

        // Shelter occupancy consistency
        var shelters = await db.Shelters.Include(s => s.Placements).ToListAsync();
        foreach (var shelter in shelters)
        {
            var activeSum = shelter.Placements.Where(p => p.Status == "Active").Sum(p => p.PeopleCount);
            Assert.Equal(activeSum, shelter.CurrentOccupancy);
            Assert.InRange(shelter.CurrentOccupancy, 0, shelter.Capacity);
        }

        // Password verification for synthetic users
        var synUser = await db.Users.FirstAsync(u => u.Email == "syn.user01@hcms.test.local");
        Assert.True(hasher.VerifyPassword(synUser, synUser.PasswordHash, "Hcms@TestSeed2026!"));

        // Reconcile report counters directly against database state
        Assert.Equal(await db.InventoryTransactions.CountAsync(), report.InsertedCounts["InventoryTransactions"]);
        Assert.Equal(await db.UserRoles.CountAsync(), report.InsertedCounts["UserRoles"]);
        Assert.Equal(
            await db.RolePermissions.CountAsync(rp => rp.Role.OrganizationId != null),
            report.InsertedCounts["OrganizationRolePermissions"]);
        Assert.True(await db.InventoryTransactions.AnyAsync(t => t.ReferenceNumber != null && t.ReferenceNumber.StartsWith("SYN-TXN-ALLOC-")));
        Assert.True(await db.InventoryTransactions.AnyAsync(t => t.ReferenceNumber != null && t.ReferenceNumber.StartsWith("SYN-TXN-DON-")));
    }

    [Fact]
    public async Task SeedAsync_SecondExecution_IsIdempotent_AndPreservesPreExistingRecords()
    {
        var (conn, db, hasher) = await CreateIsolatedDatabaseAsync();
        await using var _ = conn;
        await using var __ = db;

        // Pre-seed a real record that must never be overwritten or removed
        var realUser = new User
        {
            FullName = "Existing Real Admin",
            Email = "real.existing@example.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        realUser.PasswordHash = hasher.HashPassword(realUser, "ExistingPass!1");
        db.Users.Add(realUser);
        await db.SaveChangesAsync();

        var seeder = CreateSeeder(db, hasher);
        var first = await seeder.SeedAsync("Development");
        Assert.True(first.TotalInserted > 0);
        Assert.Equal(await db.InventoryTransactions.CountAsync(), first.InsertedCounts["InventoryTransactions"]);

        var countAfterFirst = await db.Users.CountAsync();
        var second = await seeder.SeedAsync("Development");

        Assert.True(second.Succeeded);
        Assert.Equal(0, second.TotalInserted);
        Assert.Equal(first.TotalInserted, second.TotalSkipped);
        foreach (var kvp in first.InsertedCounts)
        {
            Assert.Equal(kvp.Value, second.SkippedCounts.GetValueOrDefault(kvp.Key));
        }
        Assert.Equal(countAfterFirst, await db.Users.CountAsync());
        Assert.True(await db.Users.AnyAsync(u => u.Email == "real.existing@example.com" && u.FullName == "Existing Real Admin"));
    }

    [Fact]
    public async Task SeedAsync_InProductionEnvironment_ThrowsAndInsertsNothing()
    {
        var (conn, db, hasher) = await CreateIsolatedDatabaseAsync();
        await using var _ = conn;
        await using var __ = db;

        var seeder = CreateSeeder(db, hasher);
        await Assert.ThrowsAsync<InvalidOperationException>(() => seeder.SeedAsync("Production"));
        Assert.Equal(0, await db.Users.CountAsync());
    }

    [Fact]
    public async Task SeedAsync_WhenPrerequisitesMissing_RollsBackTransactionCleanly()
    {
        var (conn, db, hasher) = await CreateIsolatedDatabaseAsync(removeSeededRoles: true);
        await using var _ = conn;
        await using var __ = db;

        var seeder = CreateSeeder(db, hasher);
        await Assert.ThrowsAsync<InvalidOperationException>(() => seeder.SeedAsync("Development"));
        Assert.Equal(0, await db.Users.CountAsync());
        Assert.Equal(0, await db.Areas.CountAsync());
    }
}
