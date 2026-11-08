using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class RoleConfiguration : IEntityTypeConfiguration<Role>
{
    public void Configure(EntityTypeBuilder<Role> builder)
    {
        builder.HasKey(r => r.RoleId);

        builder.ToTable("Roles", table =>
    table.HasCheckConstraint(
        "CK_Roles_SystemDefined_MustBeGlobal",
        "[IsSystemDefined] = 0 OR [OrganizationId] IS NULL"));

        builder.Property(r => r.RoleName)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.Description)
            .HasMaxLength(500);

        builder.Property(r => r.IsSystemDefined)
            .IsRequired()
            .HasDefaultValue(false);

        // System-level role names must be unique
        builder.HasIndex(r => r.RoleName)
            .IsUnique()
            .HasFilter("[OrganizationId] IS NULL");

        // Organization-level role names must be unique
        // within the same organization
        builder.HasIndex(r => new { r.OrganizationId, r.RoleName })
            .IsUnique()
            .HasFilter("[OrganizationId] IS NOT NULL");

        // Organization relationship
        builder.HasOne(r => r.Organization)
            .WithMany(o => o.Roles)
            .HasForeignKey(r => r.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
