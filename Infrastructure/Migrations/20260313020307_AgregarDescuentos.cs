using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AgregarDescuentos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DescuentoTotalMonto",
                table: "Reservas",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DescuentoMonto",
                table: "Consumos",
                type: "numeric(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "DescuentoPorcentaje",
                table: "Consumos",
                type: "numeric(5,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DescuentoTotalMonto",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "DescuentoMonto",
                table: "Consumos");

            migrationBuilder.DropColumn(
                name: "DescuentoPorcentaje",
                table: "Consumos");
        }
    }
}
