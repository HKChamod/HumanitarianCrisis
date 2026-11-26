using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HumanitarianCrisisManagement.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGeographicCoordinatesToEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Warehouses",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Warehouses",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Shelters",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Shelters",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Organizations",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Organizations",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "CrisisEvents",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LocationName",
                table: "CrisisEvents",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "CrisisEvents",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Latitude",
                table: "Areas",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Longitude",
                table: "Areas",
                type: "decimal(9,6)",
                precision: 9,
                scale: 6,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Warehouses");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Warehouses");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Shelters");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Shelters");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Organizations");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "CrisisEvents");

            migrationBuilder.DropColumn(
                name: "LocationName",
                table: "CrisisEvents");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "CrisisEvents");

            migrationBuilder.DropColumn(
                name: "Latitude",
                table: "Areas");

            migrationBuilder.DropColumn(
                name: "Longitude",
                table: "Areas");
        }
    }
}
