using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddResourceAllocationManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResourceAllocations",
                columns: table => new
                {
                    AllocationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    InventoryId = table.Column<int>(type: "int", nullable: false),
                    CrisisId = table.Column<int>(type: "int", nullable: false),
                    QuantityRequested = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    QuantityAllocated = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false, defaultValue: 0m),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    RequestedByUserId = table.Column<int>(type: "int", nullable: false),
                    ApprovedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReferenceNumber = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceAllocations", x => x.AllocationId);
                    table.CheckConstraint("CK_ResourceAllocations_QuantityAllocated", "[QuantityAllocated] >= 0");
                    table.CheckConstraint("CK_ResourceAllocations_QuantityRequested", "[QuantityRequested] > 0");
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_CrisisEvents_CrisisId",
                        column: x => x.CrisisId,
                        principalTable: "CrisisEvents",
                        principalColumn: "CrisisId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_WarehouseInventories_InventoryId",
                        column: x => x.InventoryId,
                        principalTable: "WarehouseInventories",
                        principalColumn: "InventoryId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "PermissionId", "Description", "PermissionName" },
                values: new object[,]
                {
                    { 30, "View resource allocation requests and details", "ResourceAllocations.View" },
                    { 31, "Approve, reject, dispatch, deliver and cancel resource allocations", "ResourceAllocations.Manage" }
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "RolePermissionId", "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { 64, 30, 2 },
                    { 65, 31, 2 },
                    { 66, 30, 3 },
                    { 67, 31, 3 },
                    { 68, 30, 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_ApprovedByUserId",
                table: "ResourceAllocations",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_CreatedAt",
                table: "ResourceAllocations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_CrisisId",
                table: "ResourceAllocations",
                column: "CrisisId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_InventoryId",
                table: "ResourceAllocations",
                column: "InventoryId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_RequestedByUserId",
                table: "ResourceAllocations",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_Status",
                table: "ResourceAllocations",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResourceAllocations");

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 64);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 65);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 66);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 67);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 68);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 30);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 31);
        }
    }
}
