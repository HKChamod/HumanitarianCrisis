using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ResponseTeamDeploymentConfiguration : IEntityTypeConfiguration<ResponseTeamDeployment>
{
    public void Configure(EntityTypeBuilder<ResponseTeamDeployment> builder)
    {
        builder.HasKey(d => d.DeploymentId);

        builder.Property(d => d.MissionTitle)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(d => d.Notes)
            .HasMaxLength(1000);

        builder.Property(d => d.Status)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Active");

        builder.Property(d => d.DeployedAt)
            .IsRequired();

        builder.HasOne(d => d.ResponseTeam)
            .WithMany(t => t.Deployments)
            .HasForeignKey(d => d.ResponseTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(d => d.Organization)
            .WithMany()
            .HasForeignKey(d => d.OrganizationId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(d => d.Crisis)
            .WithMany()
            .HasForeignKey(d => d.CrisisId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(d => d.CitizenRequest)
            .WithMany()
            .HasForeignKey(d => d.CitizenRequestId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(d => d.Area)
            .WithMany()
            .HasForeignKey(d => d.AreaId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasOne(d => d.DeployedByUser)
            .WithMany()
            .HasForeignKey(d => d.DeployedByUserId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(d => d.OrganizationId);
        builder.HasIndex(d => d.ResponseTeamId);
        builder.HasIndex(d => d.Status);
        builder.HasIndex(d => d.CitizenRequestId);
        builder.HasIndex(d => d.CrisisId);
    }
}
