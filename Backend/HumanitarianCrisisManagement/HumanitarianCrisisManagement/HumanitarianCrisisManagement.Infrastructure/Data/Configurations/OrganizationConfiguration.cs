using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.HasKey(o => o.OrganizationId);

        builder.Property(o => o.OrganizationName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(o => o.OrganizationType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(o => o.RegistrationNumber)
            .HasMaxLength(100);

        builder.Property(o => o.Description)
            .HasMaxLength(2000);

        builder.Property(o => o.Email)
            .HasMaxLength(256);

        builder.Property(o => o.PhoneNumber)
            .HasMaxLength(20);

        builder.Property(o => o.Address)
            .HasMaxLength(500);

        builder.Property(o => o.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(o => o.CreatedAt)
            .IsRequired();

        // Registration numbers must be unique when provided
        builder.HasIndex(o => o.RegistrationNumber)
            .IsUnique()
            .HasFilter("[RegistrationNumber] IS NOT NULL");

        builder.HasIndex(o => o.OrganizationType);

        builder.HasIndex(o => o.IsActive);
    }
}
