
using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class AreaConfiguration : IEntityTypeConfiguration<Area>
{
    public void Configure(EntityTypeBuilder<Area> builder)
    {
        builder.HasKey(a => a.AreaId);

        builder.Property(a => a.AreaName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(a => a.AreaType)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(a => a.Code)
            .HasMaxLength(50);

        builder.Property(a => a.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        // Indexes
        builder.HasIndex(a => a.AreaName);

        builder.HasIndex(a => a.AreaType);

        builder.HasIndex(a => a.ParentAreaId);

        builder.HasIndex(a => a.Code)
            .IsUnique()
            .HasFilter("[Code] IS NOT NULL");

        // Self-referencing relationship
        builder.HasOne(a => a.ParentArea)
            .WithMany(a => a.ChildAreas)
            .HasForeignKey(a => a.ParentAreaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
