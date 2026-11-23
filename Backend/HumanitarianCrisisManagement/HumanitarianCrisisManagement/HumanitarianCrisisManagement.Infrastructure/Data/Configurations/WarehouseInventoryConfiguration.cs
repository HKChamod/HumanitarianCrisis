using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class WarehouseInventoryConfiguration
    : IEntityTypeConfiguration<WarehouseInventory>
{
    public void Configure(EntityTypeBuilder<WarehouseInventory> builder)
    {
        builder.ToTable("WarehouseInventories");

        builder.HasKey(i => i.InventoryId);

        builder.Property(i => i.QuantityAvailable)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(i => i.ReorderLevel)
            .HasPrecision(18, 2)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(i => i.LastUpdatedAt)
            .IsRequired();

        // Prevent duplicate resource entries in the same warehouse
        builder.HasIndex(i => new { i.WarehouseId, i.ResourceId })
            .IsUnique();

        builder.HasIndex(i => i.ResourceId);

        // Warehouse relationship
        builder.HasOne(i => i.Warehouse)
            .WithMany()
            .HasForeignKey(i => i.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        // Resource relationship
        builder.HasOne(i => i.Resource)
            .WithMany()
            .HasForeignKey(i => i.ResourceId)
            .OnDelete(DeleteBehavior.Restrict);

        // Prevent negative stock values
        builder.ToTable("WarehouseInventories", table =>
        {
            table.HasCheckConstraint(
                "CK_WarehouseInventories_QuantityAvailable",
                "[QuantityAvailable] >= 0");

            table.HasCheckConstraint(
                "CK_WarehouseInventories_ReorderLevel",
                "[ReorderLevel] >= 0");
        });
    }
}