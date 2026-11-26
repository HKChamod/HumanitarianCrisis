using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ResponseTeamConfiguration : IEntityTypeConfiguration<ResponseTeam>
{
    public void Configure(EntityTypeBuilder<ResponseTeam> builder)
    {
        builder.HasKey(t => t.ResponseTeamId);

        builder.Property(t => t.TeamName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(t => t.TeamType)
            .IsRequired()
            .HasMaxLength(80)
            .HasDefaultValue("General");

        builder.Property(t => t.BaseStation)
            .HasMaxLength(200);

        builder.Property(t => t.ContactPhone)
            .HasMaxLength(30);

        builder.Property(t => t.ContactEmail)
            .HasMaxLength(256);

        builder.Property(t => t.SpecializedEquipment)
            .HasMaxLength(1000);

        builder.Property(t => t.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Available");

        builder.Property(t => t.CreatedAt)
            .IsRequired();

        builder.HasOne(t => t.Organization)
            .WithMany(o => o.ResponseTeams)
            .HasForeignKey(t => t.OrganizationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(t => t.LeaderMembership)
            .WithMany()
            .HasForeignKey(t => t.LeaderMembershipId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(t => t.Area)
            .WithMany()
            .HasForeignKey(t => t.AreaId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(t => t.OrganizationId);
        builder.HasIndex(t => t.Status);
        builder.HasIndex(t => new { t.OrganizationId, t.TeamName }).IsUnique();
    }
}
