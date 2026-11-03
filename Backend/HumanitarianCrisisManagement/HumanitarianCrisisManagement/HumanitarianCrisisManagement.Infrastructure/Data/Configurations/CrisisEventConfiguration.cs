using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class CrisisEventConfiguration : IEntityTypeConfiguration<CrisisEvent>
{
    public void Configure(EntityTypeBuilder<CrisisEvent> builder)
    {
        builder.HasKey(c => c.CrisisId);

        builder.Property(c => c.CrisisName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.CrisisType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(c => c.Description)
            .IsRequired()
            .HasMaxLength(4000);

        builder.Property(c => c.SeverityLevel)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(c => c.StartDate)
            .IsRequired();

        builder.Property(c => c.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Active");

        builder.HasIndex(c => c.Status);

        builder.HasIndex(c => c.SeverityLevel);
    }
}