using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddConcurrencyTokensAndCurrencyCodeIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: `xmin` is a PostgreSQL *system* column that already exists on every table.
            // It is mapped as a concurrency token only in the EF model (see AppDbContext) — there is
            // no physical column to create, so the EF-generated AddColumn operations are intentionally
            // omitted here (they would fail with "column \"xmin\" already exists").

            migrationBuilder.CreateIndex(
                name: "IX_currencies_Code",
                table: "currencies",
                column: "Code",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_currencies_Code",
                table: "currencies");
        }
    }
}
