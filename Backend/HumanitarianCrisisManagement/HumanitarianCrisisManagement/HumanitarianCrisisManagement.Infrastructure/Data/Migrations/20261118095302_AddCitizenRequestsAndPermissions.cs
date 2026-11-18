using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCitizenRequestsAndPermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CitizenRequests",
                columns: table => new
                {
                    RequestId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CrisisId = table.Column<int>(type: "int", nullable: true),
                    AreaId = table.Column<int>(type: "int", nullable: false),
                    RequestType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    UrgencyLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Medium"),
                    PeopleCount = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    Address = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Latitude = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: true),
                    Longitude = table.Column<decimal>(type: "decimal(9,6)", precision: 9, scale: 6, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CitizenRequests", x => x.RequestId);
                    table.ForeignKey(
                        name: "FK_CitizenRequests_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "AreaId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CitizenRequests_CrisisEvents_CrisisId",
                        column: x => x.CrisisId,
                        principalTable: "CrisisEvents",
                        principalColumn: "CrisisId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CitizenRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "PermissionId", "Description", "PermissionName" },
                values: new object[,]
                {
                    { 24, "View citizen assistance requests", "CitizenRequests.View" },
                    { 25, "Manage citizen request status and processing", "CitizenRequests.Manage" }
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "RolePermissionId", "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { 48, 24, 2 },
                    { 49, 25, 2 },
                    { 50, 24, 3 },
                    { 51, 25, 3 },
                    { 52, 24, 4 },
                    { 53, 25, 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CitizenRequests_AreaId",
                table: "CitizenRequests",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_CitizenRequests_CreatedAt",
                table: "CitizenRequests",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CitizenRequests_CrisisId",
                table: "CitizenRequests",
                column: "CrisisId");

            migrationBuilder.CreateIndex(
                name: "IX_CitizenRequests_Status",
                table: "CitizenRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_CitizenRequests_UrgencyLevel",
                table: "CitizenRequests",
                column: "UrgencyLevel");

            migrationBuilder.CreateIndex(
                name: "IX_CitizenRequests_UserId",
                table: "CitizenRequests",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CitizenRequests");

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 48);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 49);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 50);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 51);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 52);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 53);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 24);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 25);
        }
    }
}
