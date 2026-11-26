using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class DonationConfiguration : IEntityTypeConfiguration<Donation>
{
    public void Configure(EntityTypeBuilder<Donation> builder)
    {
        builder.ToTable("Donations", table =>
        {
            table.HasCheckConstraint("CK_Donations_Amount", "[Amount] IS NULL OR [Amount] > 0");
            table.HasCheckConstraint("CK_Donations_Quantity", "[Quantity] IS NULL OR [Quantity] > 0");
        });

        builder.HasKey(d => d.DonationId);

        builder.Property(d => d.DonorName).IsRequired().HasMaxLength(200);
        builder.Property(d => d.DonorEmail).HasMaxLength(200);
        builder.Property(d => d.DonorPhone).HasMaxLength(40);
        builder.Property(d => d.DonationType).IsRequired().HasMaxLength(30).HasDefaultValue("Monetary");
        builder.Property(d => d.Amount).HasPrecision(18, 2);
        builder.Property(d => d.Currency).IsRequired().HasMaxLength(10).HasDefaultValue("LKR");
        builder.Property(d => d.Quantity).HasPrecision(18, 2);
        builder.Property(d => d.ReferenceNumber).HasMaxLength(100);
        builder.Property(d => d.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Pending");
        builder.Property(d => d.Notes).HasMaxLength(1000);
        builder.Property(d => d.CreatedAt).IsRequired();

        builder.HasOne(d => d.DonorUser)
            .WithMany()
            .HasForeignKey(d => d.DonorUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Resource)
            .WithMany()
            .HasForeignKey(d => d.ResourceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Warehouse)
            .WithMany()
            .HasForeignKey(d => d.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.InventoryTransaction)
            .WithMany()
            .HasForeignKey(d => d.InventoryTransactionId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.Crisis)
            .WithMany()
            .HasForeignKey(d => d.CrisisId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(d => d.VerifiedByUser)
            .WithMany()
            .HasForeignKey(d => d.VerifiedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(d => d.Status);
        builder.HasIndex(d => d.DonationType);
        builder.HasIndex(d => d.ReferenceNumber);
        builder.HasIndex(d => d.CreatedAt);
    }
}
