using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ShelterPlacementConfiguration : IEntityTypeConfiguration<ShelterPlacement>
{
    public void Configure(EntityTypeBuilder<ShelterPlacement> builder)
    {
        builder.ToTable("ShelterPlacements", table =>
        {
            table.HasCheckConstraint("CK_ShelterPlacements_PeopleCount", "[PeopleCount] > 0");
        });

        builder.HasKey(p => p.PlacementId);

        builder.Property(p => p.ResidentName).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Active");
        builder.Property(p => p.Notes).HasMaxLength(1000);
        builder.Property(p => p.CheckedInAt).IsRequired();

        builder.HasOne(p => p.Shelter)
            .WithMany(s => s.Placements)
            .HasForeignKey(p => p.ShelterId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.CitizenRequest)
            .WithMany()
            .HasForeignKey(p => p.CitizenRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(p => p.AssignedByUser)
            .WithMany()
            .HasForeignKey(p => p.AssignedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(p => p.ShelterId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.CitizenRequestId);
    }
}
