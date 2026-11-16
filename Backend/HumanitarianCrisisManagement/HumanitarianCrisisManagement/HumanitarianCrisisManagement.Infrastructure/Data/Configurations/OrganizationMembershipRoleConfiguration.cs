using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class OrganizationMembershipRoleConfiguration
    : IEntityTypeConfiguration<OrganizationMembershipRole>
{
    public void Configure(EntityTypeBuilder<OrganizationMembershipRole> builder)
    {
        builder.HasKey(mr => mr.MembershipRoleId);

        builder.Property(mr => mr.AssignedAt)
            .IsRequired();

        // Prevent assigning the same role twice to one membership
        builder.HasIndex(mr => new { mr.MembershipId, mr.RoleId })
            .IsUnique();

        // Membership relationship with organization scope
        builder.HasOne(mr => mr.Membership)
            .WithMany(m => m.MembershipRoles)
            .HasForeignKey(mr => new
            {
                mr.MembershipId,
                mr.OrganizationId
            })
            .HasPrincipalKey(m => new
            {
                m.MembershipId,
                m.OrganizationId
            })
            .OnDelete(DeleteBehavior.Restrict);

        // Role relationship
        builder.HasOne(mr => mr.Role)
            .WithMany(r => r.MembershipRoles)
            .HasForeignKey(mr => mr.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // User who assigned the role
        builder.HasOne(mr => mr.AssignedByUser)
            .WithMany()
            .HasForeignKey(mr => mr.AssignedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
