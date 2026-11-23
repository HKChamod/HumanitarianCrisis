using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class VolunteerAssignmentConfiguration : IEntityTypeConfiguration<VolunteerAssignment>
{
    public void Configure(EntityTypeBuilder<VolunteerAssignment> builder)
    {
        builder.ToTable("VolunteerAssignments");

        builder.HasKey(a => a.AssignmentId);

        builder.Property(a => a.RoleTitle).IsRequired().HasMaxLength(150);
        builder.Property(a => a.TaskDescription).HasMaxLength(1000);
        builder.Property(a => a.Status).IsRequired().HasMaxLength(30).HasDefaultValue("Assigned");
        builder.Property(a => a.Notes).HasMaxLength(1000);
        builder.Property(a => a.AssignedAt).IsRequired();

        builder.HasOne(a => a.Volunteer)
            .WithMany(v => v.Assignments)
            .HasForeignKey(a => a.VolunteerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.Crisis)
            .WithMany()
            .HasForeignKey(a => a.CrisisId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.AssignedByUser)
            .WithMany()
            .HasForeignKey(a => a.AssignedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => new { a.VolunteerId, a.CrisisId });
        builder.HasIndex(a => a.Status);
    }
}
