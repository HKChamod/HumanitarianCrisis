using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class InventoryTransactionConfiguration
    : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.ToTable("InventoryTransactions", table =>
        {
            table.HasCheckConstraint(
                "CK_InventoryTransactions_Quantity",
                "[Quantity] <> 0");

            table.HasCheckConstraint(
                "CK_InventoryTransactions_PreviousQuantity",
                "[PreviousQuantity] >= 0");

            table.HasCheckConstraint(
                "CK_InventoryTransactions_NewQuantity",
                "[NewQuantity] >= 0");
        });

        builder.HasKey(t => t.InventoryTransactionId);

        builder.Property(t => t.TransactionType)
            .HasConversion<string>()
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(t => t.Quantity)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.PreviousQuantity)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.NewQuantity)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(t => t.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(t => t.Notes)
            .HasMaxLength(1000);

        builder.Property(t => t.CreatedAt)
            .IsRequired();

        builder.HasOne(t => t.Inventory)
            .WithMany()
            .HasForeignKey(t => t.InventoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.PerformedByUser)
            .WithMany()
            .HasForeignKey(t => t.PerformedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => t.InventoryId);

        builder.HasIndex(t => t.PerformedByUserId);

        builder.HasIndex(t => t.CreatedAt);

        builder.HasIndex(t => t.TransferGroupId);
    }
}
