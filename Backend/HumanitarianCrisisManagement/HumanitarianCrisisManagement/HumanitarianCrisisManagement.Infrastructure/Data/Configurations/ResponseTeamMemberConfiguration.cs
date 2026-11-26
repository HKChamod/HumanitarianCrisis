using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class ResponseTeamMemberConfiguration : IEntityTypeConfiguration<ResponseTeamMember>
{
    public void Configure(EntityTypeBuilder<ResponseTeamMember> builder)
    {
        builder.HasKey(m => m.ResponseTeamMemberId);

        builder.Property(m => m.RoleInTeam)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("Member");

        builder.Property(m => m.JoinedAt)
            .IsRequired();

        builder.HasOne(m => m.ResponseTeam)
            .WithMany(t => t.Members)
            .HasForeignKey(m => m.ResponseTeamId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.Membership)
            .WithMany()
            .HasForeignKey(m => m.MembershipId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(m => new { m.ResponseTeamId, m.MembershipId }).IsUnique();
        builder.HasIndex(m => m.MembershipId);
    }
}
