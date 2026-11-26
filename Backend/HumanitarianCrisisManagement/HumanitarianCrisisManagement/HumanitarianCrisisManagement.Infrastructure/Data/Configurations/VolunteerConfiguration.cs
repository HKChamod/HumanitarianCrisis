using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class VolunteerConfiguration : IEntityTypeConfiguration<Volunteer>
{
    public void Configure(EntityTypeBuilder<Volunteer> builder)
    {
        builder.ToTable("Volunteers");

        builder.HasKey(v => v.VolunteerId);

        builder.Property(v => v.FullName).IsRequired().HasMaxLength(200);
        builder.Property(v => v.Email).IsRequired().HasMaxLength(200);
        builder.Property(v => v.PhoneNumber).HasMaxLength(40);
        builder.Property(v => v.Skills).IsRequired().HasMaxLength(1000);
        builder.Property(v => v.AvailabilityStatus).IsRequired().HasMaxLength(30).HasDefaultValue("Available");
        builder.Property(v => v.ApprovalStatus).IsRequired().HasMaxLength(30).HasDefaultValue("Pending");
        builder.Property(v => v.IsActive).IsRequired().HasDefaultValue(true);
        builder.Property(v => v.CreatedAt).IsRequired();

        builder.HasOne(v => v.User)
            .WithMany()
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(v => v.Area)
            .WithMany()
            .HasForeignKey(v => v.AreaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(v => v.Email).IsUnique();
        builder.HasIndex(v => v.AvailabilityStatus);
        builder.HasIndex(v => v.ApprovalStatus);
    }
}
