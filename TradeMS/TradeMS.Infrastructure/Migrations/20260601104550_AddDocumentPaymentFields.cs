using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDocumentPaymentFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AccountId",
                table: "documents",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Amount",
                table: "documents",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                table: "documents",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_documents_AccountId",
                table: "documents",
                column: "AccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_documents_accounts_AccountId",
                table: "documents",
                column: "AccountId",
                principalTable: "accounts",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documents_accounts_AccountId",
                table: "documents");

            migrationBuilder.DropIndex(
                name: "IX_documents_AccountId",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "Amount",
                table: "documents");

            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                table: "documents");
        }
    }
}
