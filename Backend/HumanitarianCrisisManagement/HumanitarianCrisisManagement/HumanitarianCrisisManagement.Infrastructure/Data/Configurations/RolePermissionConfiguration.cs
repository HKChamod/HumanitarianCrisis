
using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class RolePermissionConfiguration
    : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.HasKey(rp => rp.RolePermissionId);

        // Prevent duplicate permissions for the same role
        builder.HasIndex(rp => new { rp.RoleId, rp.PermissionId })
            .IsUnique();

        // Role relationship
        builder.HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        // Permission relationship
        builder.HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed global role-permission mappings
        builder.HasData(
            // Administrator - all 23 permissions
            new RolePermission { RolePermissionId = 1, RoleId = 2, PermissionId = 1 },
            new RolePermission { RolePermissionId = 2, RoleId = 2, PermissionId = 2 },
            new RolePermission { RolePermissionId = 3, RoleId = 2, PermissionId = 3 },
            new RolePermission { RolePermissionId = 4, RoleId = 2, PermissionId = 4 },
            new RolePermission { RolePermissionId = 5, RoleId = 2, PermissionId = 5 },
            new RolePermission { RolePermissionId = 6, RoleId = 2, PermissionId = 6 },
            new RolePermission { RolePermissionId = 7, RoleId = 2, PermissionId = 7 },
            new RolePermission { RolePermissionId = 8, RoleId = 2, PermissionId = 8 },
            new RolePermission { RolePermissionId = 9, RoleId = 2, PermissionId = 9 },
            new RolePermission { RolePermissionId = 10, RoleId = 2, PermissionId = 10 },
            new RolePermission { RolePermissionId = 11, RoleId = 2, PermissionId = 11 },
            new RolePermission { RolePermissionId = 12, RoleId = 2, PermissionId = 12 },
            new RolePermission { RolePermissionId = 13, RoleId = 2, PermissionId = 13 },
            new RolePermission { RolePermissionId = 14, RoleId = 2, PermissionId = 14 },
            new RolePermission { RolePermissionId = 15, RoleId = 2, PermissionId = 15 },
            new RolePermission { RolePermissionId = 16, RoleId = 2, PermissionId = 16 },
            new RolePermission { RolePermissionId = 17, RoleId = 2, PermissionId = 17 },
            new RolePermission { RolePermissionId = 18, RoleId = 2, PermissionId = 18 },
            new RolePermission { RolePermissionId = 19, RoleId = 2, PermissionId = 19 },
            new RolePermission { RolePermissionId = 20, RoleId = 2, PermissionId = 20 },
            new RolePermission { RolePermissionId = 21, RoleId = 2, PermissionId = 21 },
            new RolePermission { RolePermissionId = 22, RoleId = 2, PermissionId = 22 },
            new RolePermission { RolePermissionId = 23, RoleId = 2, PermissionId = 23 },

            // Citizen
            new RolePermission { RolePermissionId = 24, RoleId = 1, PermissionId = 6 },
            new RolePermission { RolePermissionId = 25, RoleId = 1, PermissionId = 11 },

            // CrisisManager
            new RolePermission { RolePermissionId = 26, RoleId = 3, PermissionId = 3 },
            new RolePermission { RolePermissionId = 27, RoleId = 3, PermissionId = 4 },
            new RolePermission { RolePermissionId = 28, RoleId = 3, PermissionId = 5 },
            new RolePermission { RolePermissionId = 29, RoleId = 3, PermissionId = 6 },
            new RolePermission { RolePermissionId = 30, RoleId = 3, PermissionId = 7 },
            new RolePermission { RolePermissionId = 31, RoleId = 3, PermissionId = 8 },
            new RolePermission { RolePermissionId = 32, RoleId = 3, PermissionId = 9 },
            new RolePermission { RolePermissionId = 33, RoleId = 3, PermissionId = 10 },
            new RolePermission { RolePermissionId = 34, RoleId = 3, PermissionId = 11 },
            new RolePermission { RolePermissionId = 35, RoleId = 3, PermissionId = 12 },
            new RolePermission { RolePermissionId = 36, RoleId = 3, PermissionId = 13 },
            new RolePermission { RolePermissionId = 37, RoleId = 3, PermissionId = 14 },
            new RolePermission { RolePermissionId = 38, RoleId = 3, PermissionId = 15 },

            // Responder
            new RolePermission { RolePermissionId = 39, RoleId = 4, PermissionId = 6 },
            new RolePermission { RolePermissionId = 40, RoleId = 4, PermissionId = 11 },
            new RolePermission { RolePermissionId = 41, RoleId = 4, PermissionId = 13 },
            new RolePermission { RolePermissionId = 42, RoleId = 4, PermissionId = 15 },

            // Donor
            new RolePermission { RolePermissionId = 43, RoleId = 5, PermissionId = 16 },
            new RolePermission { RolePermissionId = 44, RoleId = 5, PermissionId = 17 },

            // Volunteer
            new RolePermission { RolePermissionId = 45, RoleId = 6, PermissionId = 6 },
            new RolePermission { RolePermissionId = 46, RoleId = 6, PermissionId = 11 },
            new RolePermission { RolePermissionId = 47, RoleId = 6, PermissionId = 19 },

// Citizen Request Permissions

// Administrator
new RolePermission { RolePermissionId = 48, RoleId = 2, PermissionId = 24 },
new RolePermission { RolePermissionId = 49, RoleId = 2, PermissionId = 25 },

// CrisisManager
new RolePermission { RolePermissionId = 50, RoleId = 3, PermissionId = 24 },
new RolePermission { RolePermissionId = 51, RoleId = 3, PermissionId = 25 },

// Responder
new RolePermission { RolePermissionId = 52, RoleId = 4, PermissionId = 24 },
new RolePermission { RolePermissionId = 53, RoleId = 4, PermissionId = 25 },
// Warehouse Permissions

// Administrator
new RolePermission { RolePermissionId = 54, RoleId = 2, PermissionId = 26 },
new RolePermission { RolePermissionId = 55, RoleId = 2, PermissionId = 27 },

// CrisisManager
new RolePermission { RolePermissionId = 56, RoleId = 3, PermissionId = 26 },
new RolePermission { RolePermissionId = 57, RoleId = 3, PermissionId = 27 },

// Responder
new RolePermission { RolePermissionId = 58, RoleId = 4, PermissionId = 26 },

// Inventory Permissions

// Administrator
new RolePermission { RolePermissionId = 59, RoleId = 2, PermissionId = 28 },
new RolePermission { RolePermissionId = 60, RoleId = 2, PermissionId = 29 },

// CrisisManager
new RolePermission { RolePermissionId = 61, RoleId = 3, PermissionId = 28 },
new RolePermission { RolePermissionId = 62, RoleId = 3, PermissionId = 29 },

// Responder
new RolePermission { RolePermissionId = 63, RoleId = 4, PermissionId = 28 }
        );
    }
}
