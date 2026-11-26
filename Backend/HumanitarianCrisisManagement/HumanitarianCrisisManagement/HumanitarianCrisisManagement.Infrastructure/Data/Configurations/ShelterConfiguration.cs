using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ShelterConfiguration : IEntityTypeConfiguration<Shelter>
{
    public void Configure(EntityTypeBuilder<Shelter> builder)
    {
        builder.ToTable("Shelters", table =>
        {
            table.HasCheckConstraint("CK_Shelters_Capacity", "[Capacity] > 0");
            table.HasCheckConstraint("CK_Shelters_Occupancy", "[CurrentOccupancy] >= 0 AND [CurrentOccupancy] <= [Capacity]");
        });

        builder.HasKey(s => s.ShelterId);

        builder.Property(s => s.ShelterName).IsRequired().HasMaxLength(200);
        builder.Property(s => s.Address).IsRequired().HasMaxLength(500);
        builder.Property(s => s.Latitude).HasPrecision(9, 6);
        builder.Property(s => s.Longitude).HasPrecision(9, 6);
        builder.Property(s => s.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Open");
        builder.Property(s => s.ContactName).HasMaxLength(150);
        builder.Property(s => s.ContactPhone).HasMaxLength(40);
        builder.Property(s => s.Facilities).HasMaxLength(1000);
        builder.Property(s => s.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(s => s.CreatedAt).IsRequired();

        builder.HasOne(s => s.Area)
            .WithMany()
            .HasForeignKey(s => s.AreaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => s.AreaId);
        builder.HasIndex(s => s.Status);
        builder.HasIndex(s => s.IsActive);
    }
}
