using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeMS.Infrastructure.Migrations
{
    /// <summary>
    /// Удаляет бэкап балансов из FixPaymentBalanceSemantics: пересчёт проверен на проде
    /// и подтверждён владельцем (2026-09-29).
    /// </summary>
    public partial class DropCounterpartyBalanceBackup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS counterparty_balance_backup_20260929;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Данные бэкапа не восстановить. Пустая таблица нужна только затем, чтобы
            // откат FixPaymentBalanceSemantics не упал: его UPDATE тогда ничего не изменит.
            migrationBuilder.Sql("""
                CREATE TABLE IF NOT EXISTS counterparty_balance_backup_20260929 (
                    "Id" uuid,
                    "Balance" numeric(18,2),
                    "BackedUpAt" timestamp with time zone
                );
                """);
        }
    }
}
