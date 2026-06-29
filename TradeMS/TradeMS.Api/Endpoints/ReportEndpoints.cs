using System.Security.Claims;
using MediatR;
using TradeMS.Application.Features.Reports.Queries.GetCounterpartyBalance;
using TradeMS.Application.Features.Reports.Queries.GetDashboardSummary;
using TradeMS.Application.Features.Reports.Queries.GetSalesSummary;
using TradeMS.Application.Features.Reports.Queries.GetStockBalance;

namespace TradeMS.Api.Endpoints;

public static class ReportEndpoints
{
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/reports")
            .WithTags("Reports")
            .RequireAuthorization();

        group.MapGet("/sales-summary", async (
            DateOnly? dateFrom,
            DateOnly? dateTo,
            Guid? branchId,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var from = dateFrom ?? DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
            var to   = dateTo   ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var result = await mediator.Send(new GetSalesSummaryQuery(companyId, from, to, branchId));
            return Results.Ok(result);
        })
        .WithSummary("Sales summary: confirmed Expense documents in date range, grouped by product");

        group.MapGet("/stock-balance", async (
            Guid? branchId,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetStockBalanceQuery(companyId, branchId));
            return Results.Ok(result);
        })
        .WithSummary("Stock balance per product (optionally filtered by branchId)");

        group.MapGet("/counterparty-balance", async (
            string? type,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetCounterpartyBalanceQuery(companyId, type));
            return Results.Ok(result);
        })
        .WithSummary("Counterparty balances (optionally filtered by type: Customer|Supplier|Both)");

        group.MapGet("/dashboard", async (
            Guid? branchId,
            DateOnly? dateFrom,
            DateOnly? dateTo,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(
                new GetDashboardSummaryQuery(companyId, branchId, dateFrom, dateTo));
            return Results.Ok(result);
        })
        .WithSummary("Dashboard summary: revenue/profit for selected period (default current month), debtor debt, stock count, 12-month chart data");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
