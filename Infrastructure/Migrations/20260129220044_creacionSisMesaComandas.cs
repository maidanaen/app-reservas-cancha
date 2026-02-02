using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class creacionSisMesaComandas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reservas_Canchas_CanchaId",
                table: "Reservas");

            migrationBuilder.AlterColumn<int>(
                name: "CanchaId",
                table: "Reservas",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "MesaId",
                table: "Reservas",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Mesas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nombre = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    EstaOcupada = table.Column<bool>(type: "bit", nullable: false),
                    ReservaActualId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mesas", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reservas_MesaId",
                table: "Reservas",
                column: "MesaId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reservas_Canchas_CanchaId",
                table: "Reservas",
                column: "CanchaId",
                principalTable: "Canchas",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Reservas_Mesas_MesaId",
                table: "Reservas",
                column: "MesaId",
                principalTable: "Mesas",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reservas_Canchas_CanchaId",
                table: "Reservas");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservas_Mesas_MesaId",
                table: "Reservas");

            migrationBuilder.DropTable(
                name: "Mesas");

            migrationBuilder.DropIndex(
                name: "IX_Reservas_MesaId",
                table: "Reservas");

            migrationBuilder.DropColumn(
                name: "MesaId",
                table: "Reservas");

            migrationBuilder.AlterColumn<int>(
                name: "CanchaId",
                table: "Reservas",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservas_Canchas_CanchaId",
                table: "Reservas",
                column: "CanchaId",
                principalTable: "Canchas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
