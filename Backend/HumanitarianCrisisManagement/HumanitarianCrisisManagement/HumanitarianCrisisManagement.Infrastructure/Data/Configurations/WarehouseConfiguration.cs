using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class WarehouseConfiguration : IEntityTypeConfiguration<Warehouse>
{
    public void Configure(EntityTypeBuilder<Warehouse> builder)
    {
        builder.HasKey(w => w.WarehouseId);

        builder.Property(w => w.WarehouseName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(w => w.WarehouseCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(w => w.Description)
            .HasMaxLength(1000);

        builder.Property(w => w.Address)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(w => w.Latitude)
            .HasPrecision(9, 6);

        builder.Property(w => w.Longitude)
            .HasPrecision(9, 6);

        builder.Property(w => w.ContactPerson)
            .HasMaxLength(150);

        builder.Property(w => w.ContactNumber)
            .HasMaxLength(20);

        builder.Property(w => w.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(w => w.CreatedAt)
            .IsRequired();

        // Indexes
        builder.HasIndex(w => w.WarehouseCode)
            .IsUnique();

        builder.HasIndex(w => w.WarehouseName);

        builder.HasIndex(w => w.AreaId);

        builder.HasIndex(w => w.IsActive);

        // Area Relationship
        builder.HasOne(w => w.Area)
            .WithMany()
            .HasForeignKey(w => w.AreaId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}