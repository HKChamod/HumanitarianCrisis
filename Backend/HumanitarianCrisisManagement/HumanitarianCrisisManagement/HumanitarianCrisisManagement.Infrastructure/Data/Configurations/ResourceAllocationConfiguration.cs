
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ResourceAllocationConfiguration
    : IEntityTypeConfiguration<ResourceAllocation>
{
    public void Configure(EntityTypeBuilder<ResourceAllocation> builder)
    {
        builder.ToTable("ResourceAllocations", table =>
        {
            table.HasCheckConstraint(
                "CK_ResourceAllocations_QuantityRequested",
                "[QuantityRequested] > 0");

            table.HasCheckConstraint(
                "CK_ResourceAllocations_QuantityAllocated",
                "[QuantityAllocated] >= 0");
        });

        builder.HasKey(a => a.AllocationId);

        builder.Property(a => a.QuantityRequested)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(a => a.QuantityAllocated)
            .HasPrecision(18, 2)
            .IsRequired()
            .HasDefaultValue(0);

        builder.Property(a => a.Status)
    .HasConversion<string>()
    .HasMaxLength(20)
    .IsRequired()
    .HasDefaultValue(
        ResourceAllocationStatus.Pending)
    .HasSentinel(ResourceAllocationStatus.Pending);

        builder.Property(a => a.CreatedAt)
            .IsRequired();

        builder.HasOne(a => a.Inventory)
            .WithMany()
            .HasForeignKey(a => a.InventoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Crisis)
            .WithMany()
            .HasForeignKey(a => a.CrisisId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.CitizenRequest)
            .WithMany()
            .HasForeignKey(a => a.CitizenRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.CitizenRequestId);

        builder.HasOne(a => a.RequestedByUser)
            .WithMany()
            .HasForeignKey(a => a.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.ApprovedByUser)
            .WithMany()
            .HasForeignKey(a => a.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.InventoryId);

        builder.HasIndex(a => a.CrisisId);

        builder.HasIndex(a => a.Status);

        builder.HasIndex(a => a.RequestedByUserId);

        builder.HasIndex(a => a.ApprovedByUserId);

        builder.HasIndex(a => a.CreatedAt);

        builder.Property(a => a.ReferenceNumber)
    .HasMaxLength(100);

        builder.Property(a => a.Notes)
            .HasMaxLength(1000);
    }
}
