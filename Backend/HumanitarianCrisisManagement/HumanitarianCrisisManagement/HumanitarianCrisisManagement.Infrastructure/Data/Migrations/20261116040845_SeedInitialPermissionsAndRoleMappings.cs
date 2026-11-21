using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using HumanitarianCrisisManagement.Infrastructure.Data;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20261116040845_SeedInitialPermissionsAndRoleMappings")]
    public partial class SeedInitialPermissionsAndRoleMappings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "PermissionId", "Description", "PermissionName" },
                columnTypes: new string[] { "int", "nvarchar(max)", "nvarchar(max)" },
                values: new object[,]
                {
                    { 1, "View user accounts", "Users.View" },
                    { 2, "Manage user accounts", "Users.Manage" },
                    { 3, "View organizations", "Organizations.View" },
                    { 4, "Manage organizations", "Organizations.Manage" },
                    { 5, "Approve organization membership requests", "Organizations.ApproveMembers" },
                    { 6, "View crisis events", "CrisisEvents.View" },
                    { 7, "Create crisis events", "CrisisEvents.Create" },
                    { 8, "Update crisis events", "CrisisEvents.Update" },
                    { 9, "Delete crisis events", "CrisisEvents.Delete" },
                    { 10, "Manage crisis event operations", "CrisisEvents.Manage" },
                    { 11, "View affected areas", "Areas.View" },
                    { 12, "Manage affected areas", "Areas.Manage" },
                    { 13, "View available resources", "Resources.View" },
                    { 14, "Manage resource inventory", "Resources.Manage" },
                    { 15, "Allocate resources to crisis operations", "Resources.Allocate" },
                    { 16, "View donations", "Donations.View" },
                    { 17, "Manage donations", "Donations.Manage" },
                    { 18, "Verify donation records", "Donations.Verify" },
                    { 19, "View volunteer information", "Volunteers.View" },
                    { 20, "Manage volunteer information", "Volunteers.Manage" },
                    { 21, "Approve volunteer applications", "Volunteers.Approve" },
                    { 22, "View system reports", "Reports.View" },
                    { 23, "Generate system reports", "Reports.Generate" }
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "RolePermissionId", "PermissionId", "RoleId" },
                columnTypes: new string[] { "int", "int", "int" },
                values: new object[,]
                {
                    { 1, 1, 2 },
                    { 2, 2, 2 },
                    { 3, 3, 2 },
                    { 4, 4, 2 },
                    { 5, 5, 2 },
                    { 6, 6, 2 },
                    { 7, 7, 2 },
                    { 8, 8, 2 },
                    { 9, 9, 2 },
                    { 10, 10, 2 },
                    { 11, 11, 2 },
                    { 12, 12, 2 },
                    { 13, 13, 2 },
                    { 14, 14, 2 },
                    { 15, 15, 2 },
                    { 16, 16, 2 },
                    { 17, 17, 2 },
                    { 18, 18, 2 },
                    { 19, 19, 2 },
                    { 20, 20, 2 },
                    { 21, 21, 2 },
                    { 22, 22, 2 },
                    { 23, 23, 2 },
                    { 24, 6, 1 },
                    { 25, 11, 1 },
                    { 26, 3, 3 },
                    { 27, 4, 3 },
                    { 28, 5, 3 },
                    { 29, 6, 3 },
                    { 30, 7, 3 },
                    { 31, 8, 3 },
                    { 32, 9, 3 },
                    { 33, 10, 3 },
                    { 34, 11, 3 },
                    { 35, 12, 3 },
                    { 36, 13, 3 },
                    { 37, 14, 3 },
                    { 38, 15, 3 },
                    { 39, 6, 4 },
                    { 40, 11, 4 },
                    { 41, 13, 4 },
                    { 42, 15, 4 },
                    { 43, 16, 5 },
                    { 44, 17, 5 },
                    { 45, 6, 6 },
                    { 46, 11, 6 },
                    { 47, 19, 6 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 23);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 25);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 26);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 27);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 28);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 29);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 30);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 31);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 32);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 33);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 34);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 35);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 36);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 37);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 38);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 39);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 40);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 41);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 42);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 43);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 44);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 45);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 46);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 47);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 12);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 13);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 14);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 15);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 16);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 17);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 18);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 19);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 20);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 21);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 22);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 23);
        }
    }
}
