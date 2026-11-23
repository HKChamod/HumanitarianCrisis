using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ResourceConfiguration : IEntityTypeConfiguration<Resource>
{
    public void Configure(EntityTypeBuilder<Resource> builder)
    {
        builder.ToTable("Resources");

        builder.HasKey(r => r.ResourceId);

        builder.Property(r => r.ResourceName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(r => r.ResourceCategory)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.Description)
            .HasMaxLength(1000);

        builder.Property(r => r.UnitOfMeasure)
            .IsRequired()
            .HasMaxLength(30);

        builder.Property(r => r.IsPerishable)
            .IsRequired()
            .HasDefaultValue(false);

        builder.Property(r => r.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        builder.HasIndex(r => r.ResourceName);

        builder.HasIndex(r => r.ResourceCategory);

        builder.HasIndex(r => r.IsActive);
    }
}