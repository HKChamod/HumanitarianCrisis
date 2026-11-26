
using Microsoft.EntityFrameworkCore;
using HumanitarianCrisisManagement.Domain.Entities;

namespace HumanitarianCrisisManagement.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Warehouse> Warehouses => Set<Warehouse>();

    // Organizations
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMembership> OrganizationMemberships
        => Set<OrganizationMembership>();
    public DbSet<OrganizationMembershipRole> OrganizationMembershipRoles
        => Set<OrganizationMembershipRole>();

    // Crisis Management
    public DbSet<CrisisEvent> CrisisEvents => Set<CrisisEvent>();
    public DbSet<Area> Areas => Set<Area>();
    public DbSet<CitizenRequest> CitizenRequests => Set<CitizenRequest>();

    public DbSet<Resource> Resources => Set<Resource>();

    public DbSet<WarehouseInventory> WarehouseInventories => Set<WarehouseInventory>();

    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();

    public DbSet<ResourceAllocation> ResourceAllocations => Set<ResourceAllocation>();

    public DbSet<AiRecommendation> AiRecommendations => Set<AiRecommendation>();

    // Shelters, Volunteers, Donations, Notifications & Audit
    public DbSet<Shelter> Shelters => Set<Shelter>();
    public DbSet<ShelterPlacement> ShelterPlacements => Set<ShelterPlacement>();
    public DbSet<Volunteer> Volunteers => Set<Volunteer>();
    public DbSet<VolunteerAssignment> VolunteerAssignments => Set<VolunteerAssignment>();
    public DbSet<Donation> Donations => Set<Donation>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();
    public DbSet<ResponseTeam> ResponseTeams => Set<ResponseTeam>();
    public DbSet<ResponseTeamMember> ResponseTeamMembers => Set<ResponseTeamMember>();
    public DbSet<ResponseTeamDeployment> ResponseTeamDeployments => Set<ResponseTeamDeployment>();
    public DbSet<OrganizationArea> OrganizationAreas => Set<OrganizationArea>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly);
    }
}
