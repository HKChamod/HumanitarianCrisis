using Microsoft.EntityFrameworkCore;
using HumanitarianCrisisManagement.Domain.Entities;
using System.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(
        DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Role> Roles => Set<Role>();

    public DbSet<UserRole> UserRoles => Set<UserRole>();

    public DbSet<CrisisEvent> CrisisEvents => Set<CrisisEvent>();
}