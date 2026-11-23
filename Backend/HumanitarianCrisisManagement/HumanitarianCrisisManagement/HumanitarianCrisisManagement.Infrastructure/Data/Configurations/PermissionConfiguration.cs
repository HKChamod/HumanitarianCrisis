
using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.HasKey(p => p.PermissionId);

        builder.Property(p => p.PermissionName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Description)
            .HasMaxLength(500);

        builder.HasIndex(p => p.PermissionName)
            .IsUnique();

        // Seed initial system permissions
        builder.HasData(
            new Permission { PermissionId = 1, PermissionName = "Users.View", Description = "View user accounts" },
            new Permission { PermissionId = 2, PermissionName = "Users.Manage", Description = "Manage user accounts" },

            new Permission { PermissionId = 3, PermissionName = "Organizations.View", Description = "View organizations" },
            new Permission { PermissionId = 4, PermissionName = "Organizations.Manage", Description = "Manage organizations" },
            new Permission { PermissionId = 5, PermissionName = "Organizations.ApproveMembers", Description = "Approve organization membership requests" },

            new Permission { PermissionId = 6, PermissionName = "CrisisEvents.View", Description = "View crisis events" },
            new Permission { PermissionId = 7, PermissionName = "CrisisEvents.Create", Description = "Create crisis events" },
            new Permission { PermissionId = 8, PermissionName = "CrisisEvents.Update", Description = "Update crisis events" },
            new Permission { PermissionId = 9, PermissionName = "CrisisEvents.Delete", Description = "Delete crisis events" },
            new Permission { PermissionId = 10, PermissionName = "CrisisEvents.Manage", Description = "Manage crisis event operations" },

            new Permission { PermissionId = 11, PermissionName = "Areas.View", Description = "View affected areas" },
            new Permission { PermissionId = 12, PermissionName = "Areas.Manage", Description = "Manage affected areas" },

            new Permission { PermissionId = 13, PermissionName = "Resources.View", Description = "View available resources" },
            new Permission { PermissionId = 14, PermissionName = "Resources.Manage", Description = "Manage resource inventory" },
            new Permission { PermissionId = 15, PermissionName = "Resources.Allocate", Description = "Allocate resources to crisis operations" },

            new Permission { PermissionId = 16, PermissionName = "Donations.View", Description = "View donations" },
            new Permission { PermissionId = 17, PermissionName = "Donations.Manage", Description = "Manage donations" },
            new Permission { PermissionId = 18, PermissionName = "Donations.Verify", Description = "Verify donation records" },

            new Permission { PermissionId = 19, PermissionName = "Volunteers.View", Description = "View volunteer information" },
            new Permission { PermissionId = 20, PermissionName = "Volunteers.Manage", Description = "Manage volunteer information" },
            new Permission { PermissionId = 21, PermissionName = "Volunteers.Approve", Description = "Approve volunteer applications" },

            new Permission { PermissionId = 22, PermissionName = "Reports.View", Description = "View system reports" },
            new Permission { PermissionId = 23, PermissionName = "Reports.Generate", Description = "Generate system reports" },
            new Permission
            {
                PermissionId = 24,
                PermissionName = "CitizenRequests.View",
                Description = "View citizen assistance requests"
            },

new Permission
{
    PermissionId = 25,
    PermissionName = "CitizenRequests.Manage",
    Description = "Manage citizen request status and processing"
},
       new Permission
       {
           PermissionId = 26,
           PermissionName = "Warehouses.View",
           Description = "View warehouse information"
       },

new Permission
{
    PermissionId = 27,
    PermissionName = "Warehouses.Manage",
    Description = "Create, update and delete warehouses"
},
new Permission
{
    PermissionId = 28,
    PermissionName = "Inventory.View",
    Description = "View warehouse inventory and stock levels"
},

new Permission
{
    PermissionId = 29,
    PermissionName = "Inventory.Manage",
    Description = "Manage warehouse inventory records and reorder levels"
},

new Permission
{
    PermissionId = 30,
    PermissionName = "ResourceAllocations.View",
    Description = "View resource allocation requests and details"
},

new Permission
{
    PermissionId = 31,
    PermissionName = "ResourceAllocations.Manage",
    Description = "Approve, reject, dispatch, deliver and cancel resource allocations"
},

new Permission
{
    PermissionId = 32,
    PermissionName = "AI.View",
    Description = "View AI decision support recommendations and provider status"
},

new Permission
{
    PermissionId = 33,
    PermissionName = "AI.Review",
    Description = "Trigger AI analysis and approve, override, or reject AI recommendations"
});
    }
}
