using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAreaEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Areas",
                columns: table => new
                {
                    AreaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AreaName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AreaType = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ParentAreaId = table.Column<int>(type: "int", nullable: true),
                    Code = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Areas", x => x.AreaId);
                    table.ForeignKey(
                        name: "FK_Areas_Areas_ParentAreaId",
                        column: x => x.ParentAreaId,
                        principalTable: "Areas",
                        principalColumn: "AreaId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Areas_AreaName",
                table: "Areas",
                column: "AreaName");

            migrationBuilder.CreateIndex(
                name: "IX_Areas_AreaType",
                table: "Areas",
                column: "AreaType");

            migrationBuilder.CreateIndex(
                name: "IX_Areas_Code",
                table: "Areas",
                column: "Code",
                unique: true,
                filter: "[Code] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Areas_ParentAreaId",
                table: "Areas",
                column: "ParentAreaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Areas");
        }
    }
}
