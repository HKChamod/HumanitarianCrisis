using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAiDecisionSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AiRecommendations",
                columns: table => new
                {
                    RecommendationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CitizenRequestId = table.Column<int>(type: "int", nullable: false),
                    CrisisId = table.Column<int>(type: "int", nullable: true),
                    SuggestedCategory = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SuggestedUrgencyLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsPotentialDuplicate = table.Column<bool>(type: "bit", nullable: false),
                    DuplicateOfRequestId = table.Column<int>(type: "int", nullable: true),
                    SuggestedInventoryId = table.Column<int>(type: "int", nullable: true),
                    SuggestedResourceQuantity = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    ConfidenceScore = table.Column<decimal>(type: "decimal(5,4)", precision: 5, scale: 4, nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    ProviderName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    ModelVersion = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ReviewStatus = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "PendingReview"),
                    ReviewedByUserId = table.Column<int>(type: "int", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    HumanDecisionNote = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    OverriddenCategory = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    OverriddenUrgencyLevel = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiRecommendations", x => x.RecommendationId);
                    table.CheckConstraint("CK_AiRecommendations_ConfidenceScore", "[ConfidenceScore] >= 0 AND [ConfidenceScore] <= 1");
                    table.CheckConstraint("CK_AiRecommendations_SuggestedResourceQuantity", "[SuggestedResourceQuantity] IS NULL OR [SuggestedResourceQuantity] > 0");
                    table.ForeignKey(
                        name: "FK_AiRecommendations_CitizenRequests_CitizenRequestId",
                        column: x => x.CitizenRequestId,
                        principalTable: "CitizenRequests",
                        principalColumn: "RequestId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_CitizenRequests_DuplicateOfRequestId",
                        column: x => x.DuplicateOfRequestId,
                        principalTable: "CitizenRequests",
                        principalColumn: "RequestId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_CrisisEvents_CrisisId",
                        column: x => x.CrisisId,
                        principalTable: "CrisisEvents",
                        principalColumn: "CrisisId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiRecommendations_WarehouseInventories_SuggestedInventoryId",
                        column: x => x.SuggestedInventoryId,
                        principalTable: "WarehouseInventories",
                        principalColumn: "InventoryId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "Permissions",
                columns: new[] { "PermissionId", "Description", "PermissionName" },
                values: new object[,]
                {
                    { 32, "View AI decision support recommendations and provider status", "AI.View" },
                    { 33, "Trigger AI analysis and approve, override, or reject AI recommendations", "AI.Review" }
                });

            migrationBuilder.InsertData(
                table: "RolePermissions",
                columns: new[] { "RolePermissionId", "PermissionId", "RoleId" },
                values: new object[,]
                {
                    { 69, 32, 2 },
                    { 70, 33, 2 },
                    { 71, 32, 3 },
                    { 72, 33, 3 },
                    { 73, 32, 4 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_CitizenRequestId",
                table: "AiRecommendations",
                column: "CitizenRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_CreatedAt",
                table: "AiRecommendations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_CrisisId",
                table: "AiRecommendations",
                column: "CrisisId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_DuplicateOfRequestId",
                table: "AiRecommendations",
                column: "DuplicateOfRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_ReviewedByUserId",
                table: "AiRecommendations",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_ReviewStatus",
                table: "AiRecommendations",
                column: "ReviewStatus");

            migrationBuilder.CreateIndex(
                name: "IX_AiRecommendations_SuggestedInventoryId",
                table: "AiRecommendations",
                column: "SuggestedInventoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiRecommendations");

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 69);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 70);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 71);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 72);

            migrationBuilder.DeleteData(
                table: "RolePermissions",
                keyColumn: "RolePermissionId",
                keyValue: 73);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 32);

            migrationBuilder.DeleteData(
                table: "Permissions",
                keyColumn: "PermissionId",
                keyValue: 33);
        }
    }
}
