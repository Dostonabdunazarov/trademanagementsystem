using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TradeMS.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAuditLogCompanyId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_audit_logs_UserId_CreatedAt",
                table: "audit_logs");

            migrationBuilder.AddColumn<Guid>(
                name: "CompanyId",
                table: "audit_logs",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_CompanyId_CreatedAt",
                table: "audit_logs",
                columns: new[] { "CompanyId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId",
                table: "audit_logs",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_audit_logs_CompanyId_CreatedAt",
                table: "audit_logs");

            migrationBuilder.DropIndex(
                name: "IX_audit_logs_UserId",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "audit_logs");

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_UserId_CreatedAt",
                table: "audit_logs",
                columns: new[] { "UserId", "CreatedAt" });
        }
    }
}
