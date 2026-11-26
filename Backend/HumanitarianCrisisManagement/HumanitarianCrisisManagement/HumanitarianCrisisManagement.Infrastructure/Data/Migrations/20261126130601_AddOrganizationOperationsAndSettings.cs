using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationOperationsAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoAssignNotifications",
                table: "Organizations",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "CompactTables",
                table: "Organizations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "CrisisAlertsEnabled",
                table: "Organizations",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "EmailAlertsEnabled",
                table: "Organizations",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "EmergencyContactPhone",
                table: "Organizations",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PreferredLanguage",
                table: "Organizations",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "en");

            migrationBuilder.AddColumn<string>(
                name: "PrimaryContactName",
                table: "Organizations",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RequestAlertsEnabled",
                table: "Organizations",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "Organizations",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrganizationAreas",
                columns: table => new
                {
                    OrganizationAreaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrganizationId = table.Column<int>(type: "int", nullable: false),
                    AreaId = table.Column<int>(type: "int", nullable: false),
                    AssignmentStatus = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false, defaultValue: "Active"),
                    PrimaryContact = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AssignedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationAreas", x => x.OrganizationAreaId);
                    table.ForeignKey(
                        name: "FK_OrganizationAreas_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "AreaId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrganizationAreas_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "OrganizationId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OrganizationAreas_Users_AssignedByUserId",
                        column: x => x.AssignedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ResponseTeams",
                columns: table => new
                {
                    ResponseTeamId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OrganizationId = table.Column<int>(type: "int", nullable: false),
                    TeamName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    TeamType = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false, defaultValue: "General"),
                    LeaderMembershipId = table.Column<int>(type: "int", nullable: true),
                    AreaId = table.Column<int>(type: "int", nullable: true),
                    BaseStation = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    ContactPhone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    ContactEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SpecializedEquipment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Available"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponseTeams", x => x.ResponseTeamId);
                    table.ForeignKey(
                        name: "FK_ResponseTeams_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "AreaId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ResponseTeams_OrganizationMemberships_LeaderMembershipId",
                        column: x => x.LeaderMembershipId,
                        principalTable: "OrganizationMemberships",
                        principalColumn: "MembershipId");
                    table.ForeignKey(
                        name: "FK_ResponseTeams_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "OrganizationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ResponseTeamDeployments",
                columns: table => new
                {
                    DeploymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResponseTeamId = table.Column<int>(type: "int", nullable: false),
                    OrganizationId = table.Column<int>(type: "int", nullable: false),
                    CrisisId = table.Column<int>(type: "int", nullable: true),
                    CitizenRequestId = table.Column<int>(type: "int", nullable: true),
                    AreaId = table.Column<int>(type: "int", nullable: true),
                    MissionTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    DeployedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeployedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponseTeamDeployments", x => x.DeploymentId);
                    table.ForeignKey(
                        name: "FK_ResponseTeamDeployments_Areas_AreaId",
                        column: x => x.AreaId,
                        principalTable: "Areas",
                        principalColumn: "AreaId");
                    table.ForeignKey(
                        name: "FK_ResponseTeamDeployments_CitizenRequests_CitizenRequestId",
                        column: x => x.CitizenRequestId,
                        principalTable: "CitizenRequests",
                        principalColumn: "RequestId");
                    table.ForeignKey(
                        name: "FK_ResponseTeamDeployments_CrisisEvents_CrisisId",
                        column: x => x.CrisisId,
                        principalTable: "CrisisEvents",
                        principalColumn: "CrisisId");
                    table.ForeignKey(
                        name: "FK_ResponseTeamDeployments_Organizations_OrganizationId",
                        column: x => x.OrganizationId,
                        principalTable: "Organizations",
                        principalColumn: "OrganizationId");
                    table.ForeignKey(
                        name: "FK_ResponseTeamDeployments_ResponseTeams_ResponseTeamId",
                        column: x => x.ResponseTeamId,
                        principalTable: "ResponseTeams",
                        principalColumn: "ResponseTeamId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ResponseTeamDeployments_Users_DeployedByUserId",
                        column: x => x.DeployedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId");
                });

            migrationBuilder.CreateTable(
                name: "ResponseTeamMembers",
                columns: table => new
                {
                    ResponseTeamMemberId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ResponseTeamId = table.Column<int>(type: "int", nullable: false),
                    MembershipId = table.Column<int>(type: "int", nullable: false),
                    RoleInTeam = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "Member"),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResponseTeamMembers", x => x.ResponseTeamMemberId);
                    table.ForeignKey(
                        name: "FK_ResponseTeamMembers_OrganizationMemberships_MembershipId",
                        column: x => x.MembershipId,
                        principalTable: "OrganizationMemberships",
                        principalColumn: "MembershipId");
                    table.ForeignKey(
                        name: "FK_ResponseTeamMembers_ResponseTeams_ResponseTeamId",
                        column: x => x.ResponseTeamId,
                        principalTable: "ResponseTeams",
                        principalColumn: "ResponseTeamId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationAreas_AreaId",
                table: "OrganizationAreas",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationAreas_AssignedByUserId",
                table: "OrganizationAreas",
                column: "AssignedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationAreas_OrganizationId_AreaId",
                table: "OrganizationAreas",
                columns: new[] { "OrganizationId", "AreaId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_AreaId",
                table: "ResponseTeamDeployments",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_CitizenRequestId",
                table: "ResponseTeamDeployments",
                column: "CitizenRequestId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_CrisisId",
                table: "ResponseTeamDeployments",
                column: "CrisisId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_DeployedByUserId",
                table: "ResponseTeamDeployments",
                column: "DeployedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_OrganizationId",
                table: "ResponseTeamDeployments",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_ResponseTeamId",
                table: "ResponseTeamDeployments",
                column: "ResponseTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamDeployments_Status",
                table: "ResponseTeamDeployments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamMembers_MembershipId",
                table: "ResponseTeamMembers",
                column: "MembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeamMembers_ResponseTeamId_MembershipId",
                table: "ResponseTeamMembers",
                columns: new[] { "ResponseTeamId", "MembershipId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeams_AreaId",
                table: "ResponseTeams",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeams_LeaderMembershipId",
                table: "ResponseTeams",
                column: "LeaderMembershipId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeams_OrganizationId",
                table: "ResponseTeams",
                column: "OrganizationId");

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeams_OrganizationId_TeamName",
                table: "ResponseTeams",
                columns: new[] { "OrganizationId", "TeamName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResponseTeams_Status",
                table: "ResponseTeams",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizationAreas");

            migrationBuilder.DropTable(
                name: "ResponseTeamDeployments");

            migrationBuilder.DropTable(
                name: "ResponseTeamMembers");

            migrationBuilder.DropTable(
                name: "ResponseTeams");

            migrationBuilder.DropColumn(
                name: "AutoAssignNotifications",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "CompactTables",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "CrisisAlertsEnabled",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "EmailAlertsEnabled",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "EmergencyContactPhone",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "PreferredLanguage",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "PrimaryContactName",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "RequestAlertsEnabled",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "Organizations");
        }
    }
}
