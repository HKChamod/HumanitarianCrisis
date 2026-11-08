
using Microsoft.EntityFrameworkCore;
using HumanitarianCrisisManagement.Domain.Entities;

namespace HumanitarianCrisisManagement.Infrastructure.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Identity
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();

    // Organizations
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMembership> OrganizationMemberships
        => Set<OrganizationMembership>();
    public DbSet<OrganizationMembershipRole> OrganizationMembershipRoles
        => Set<OrganizationMembershipRole>();

    // Crisis Management
    public DbSet<CrisisEvent> CrisisEvents => Set<CrisisEvent>();
    public DbSet<Area> Areas => Set<Area>();

   

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(
            typeof(ApplicationDbContext).Assembly);
    }
}
