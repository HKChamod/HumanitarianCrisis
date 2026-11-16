using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class OrganizationMembershipConfiguration
    : IEntityTypeConfiguration<OrganizationMembership>
{
    public void Configure(EntityTypeBuilder<OrganizationMembership> builder)
    {
        builder.HasKey(m => m.MembershipId);

        // Composite key for organization-scoped role assignments
        builder.HasAlternateKey(m => new
        {
            m.MembershipId,
            m.OrganizationId
        });

        builder.Property(m => m.MembershipStatus)
            .IsRequired()
            .HasMaxLength(30)
            .HasDefaultValue("Pending");

        builder.Property(m => m.JoinedAt)
            .IsRequired();

        builder.Property(m => m.ApprovedAt);

        // A user can have only one membership per organization
        builder.HasIndex(m => new { m.UserId, m.OrganizationId })
            .IsUnique();

        builder.HasIndex(m => m.MembershipStatus);

        // User relationship
        builder.HasOne(m => m.User)
            .WithMany(u => u.OrganizationMemberships)
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        // Organization relationship
        builder.HasOne(m => m.Organization)
            .WithMany(o => o.Memberships)
            .HasForeignKey(m => m.OrganizationId)
            .OnDelete(DeleteBehavior.Restrict);

        // User who approved the membership
        builder.HasOne(m => m.ApprovedByUser)
            .WithMany()
            .HasForeignKey(m => m.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
