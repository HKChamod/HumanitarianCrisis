using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class CitizenRequestConfiguration
    : IEntityTypeConfiguration<CitizenRequest>
{
    public void Configure(EntityTypeBuilder<CitizenRequest> builder)
    {
        builder.HasKey(r => r.RequestId);

        builder.Property(r => r.RequestType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.Description)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(r => r.UrgencyLevel)
            .IsRequired()
            .HasMaxLength(20)
            .HasDefaultValue("Medium");

        builder.Property(r => r.PeopleCount)
            .IsRequired()
            .HasDefaultValue(1);

        builder.Property(r => r.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Pending");

        builder.Property(r => r.Address)
            .HasMaxLength(500);

        builder.Property(r => r.Latitude)
            .HasPrecision(9, 6);

        builder.Property(r => r.Longitude)
            .HasPrecision(9, 6);

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        // User relationship
        builder.HasOne(r => r.User)
            .WithMany(u => u.CitizenRequests)
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Optional Crisis Event relationship
        builder.HasOne(r => r.CrisisEvent)
            .WithMany(c => c.CitizenRequests)
            .HasForeignKey(r => r.CrisisId)
            .OnDelete(DeleteBehavior.Restrict);

        // Area relationship
        builder.HasOne(r => r.Area)
            .WithMany(a => a.CitizenRequests)
            .HasForeignKey(r => r.AreaId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(r => r.UserId);

        builder.HasIndex(r => r.CrisisId);

        builder.HasIndex(r => r.AreaId);

        builder.HasIndex(r => r.Status);

        builder.HasIndex(r => r.UrgencyLevel);

        builder.HasIndex(r => r.CreatedAt);
    }
}