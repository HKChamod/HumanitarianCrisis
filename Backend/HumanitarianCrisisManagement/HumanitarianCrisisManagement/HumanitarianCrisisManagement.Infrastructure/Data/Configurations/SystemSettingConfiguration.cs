using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class SystemSettingConfiguration : IEntityTypeConfiguration<SystemSetting>
{
    public void Configure(EntityTypeBuilder<SystemSetting> builder)
    {
        builder.ToTable("SystemSettings");

        builder.HasKey(s => s.SystemSettingId);

        builder.Property(s => s.SettingKey)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.Category)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.SettingValue)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(s => s.UpdatedAt)
            .IsRequired();

        builder.HasIndex(s => s.SettingKey)
            .IsUnique();

        builder.HasIndex(s => s.Category);

        builder.HasOne(s => s.UpdatedByUser)
            .WithMany()
            .HasForeignKey(s => s.UpdatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
