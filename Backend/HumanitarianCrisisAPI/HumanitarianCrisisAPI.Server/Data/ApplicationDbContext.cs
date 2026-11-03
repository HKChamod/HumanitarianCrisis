using Microsoft.EntityFrameworkCore;
using HumanitarianCrisisAPI.Models;

namespace HumanitarianCrisisAPI.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<AssistanceRequest> AssistanceRequests
    => Set<AssistanceRequest>();

    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<UserRole> UserRoles => Set<UserRole>();

    public DbSet<CrisisEvent> CrisisEvents => Set<CrisisEvent>();

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // UserRole configuration
        modelBuilder.Entity<UserRole>()
            .HasIndex(ur => new
            {
                ur.UserId,
                ur.RoleId
            })
            .IsUnique();

        modelBuilder.Entity<AssistanceRequest>()
    .HasOne(r => r.Crisis)
    .WithMany(c => c.AssistanceRequests)
    .HasForeignKey(r => r.CrisisId)
    .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AssistanceRequest>()
            .HasOne(r => r.Citizen)
            .WithMany(u => u.AssistanceRequests)
            .HasForeignKey(r => r.CitizenId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.User)
            .WithMany(u => u.UserRoles)
            .HasForeignKey(ur => ur.UserId);

        modelBuilder.Entity<UserRole>()
            .HasOne(ur => ur.Role)
            .WithMany(r => r.UserRoles)
            .HasForeignKey(ur => ur.RoleId);

        // Seed initial roles
        modelBuilder.Entity<Role>().HasData(
            new Role
            {
                RoleId = 1,
                RoleName = "Citizen"
            },
            new Role
            {
                RoleId = 2,
                RoleName = "Emergency Coordinator"
            },
            new Role
            {
                RoleId = 3,
                RoleName = "Case Manager"
            },
            new Role
            {
                RoleId = 4,
                RoleName = "Logistics Manager"
            },
            new Role
            {
                RoleId = 5,
                RoleName = "Shelter Administrator"
            },
            new Role
            {
                RoleId = 6,
                RoleName = "Volunteer Coordinator"
            },
            new Role
            {
                RoleId = 7,
                RoleName = "System Administrator"
            }
        );
    }
}