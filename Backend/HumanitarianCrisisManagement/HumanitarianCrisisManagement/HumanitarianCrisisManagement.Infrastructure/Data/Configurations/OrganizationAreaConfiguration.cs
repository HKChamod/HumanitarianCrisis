using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class OrganizationAreaConfiguration : IEntityTypeConfiguration<OrganizationArea>
{
    public void Configure(EntityTypeBuilder<OrganizationArea> builder)
    {
        builder.HasKey(oa => oa.OrganizationAreaId);

        builder.Property(oa => oa.AssignmentStatus)
            .IsRequired()
            .HasMaxLength(40)
            .HasDefaultValue("Active");

        builder.Property(oa => oa.PrimaryContact)
            .HasMaxLength(150);

        builder.Property(oa => oa.Notes)
            .HasMaxLength(1000);

        builder.Property(oa => oa.AssignedAt)
            .IsRequired();

        builder.HasOne(oa => oa.Organization)
            .WithMany(o => o.OrganizationAreas)
            .HasForeignKey(oa => oa.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(oa => oa.Area)
            .WithMany()
            .HasForeignKey(oa => oa.AreaId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(oa => oa.AssignedByUser)
            .WithMany()
            .HasForeignKey(oa => oa.AssignedByUserId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(oa => new { oa.OrganizationId, oa.AreaId }).IsUnique();
        builder.HasIndex(oa => oa.AreaId);
    }
}
