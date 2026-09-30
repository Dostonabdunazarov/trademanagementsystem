using System.Security.Claims;
using MediatR;
using TradeMS.Api.Infrastructure;
using TradeMS.Application.Common.Time;
using TradeMS.Application.Features.Reports.Queries.GetCounterpartyBalance;
using TradeMS.Application.Features.Reports.Queries.GetDashboardSummary;
using TradeMS.Application.Features.Reports.Queries.GetSalesSummary;
using TradeMS.Application.Features.Reports.Queries.GetStockBalance;
using TradeMS.Application.Features.Reports.Queries.GetStockForecast;

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
            var companyId = user.GetCompanyId();
            var to   = dateTo   ?? BusinessClock.Today;
            var from = dateFrom ?? to.AddDays(-30);
            var result = await mediator.Send(new GetSalesSummaryQuery(companyId, from, to, user.BranchScope(branchId)));
            return Results.Ok(result);
        })
        .WithSummary("Sales summary: confirmed Expense documents in date range, grouped by product");

        group.MapGet("/stock-balance", async (
            Guid? branchId,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = user.GetCompanyId();
            var result = await mediator.Send(new GetStockBalanceQuery(companyId, user.BranchScope(branchId)));
            return Results.Ok(result);
        })
        .WithSummary("Stock balance per product (optionally filtered by branchId)");

        group.MapGet("/stock-forecast", async (
            Guid? branchId,
            int? days,
            int? limit,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = user.GetCompanyId();
            var result = await mediator.Send(
                new GetStockForecastQuery(companyId, user.BranchScope(branchId), days ?? 30, limit ?? 20));
            return Results.Ok(result);
        })
        .WithSummary("Stock run-out forecast: average daily sales over the last N days and days of stock left");

        group.MapGet("/counterparty-balance", async (
            string? type,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = user.GetCompanyId();
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
            var companyId = user.GetCompanyId();
            var result = await mediator.Send(
                new GetDashboardSummaryQuery(companyId, user.BranchScope(branchId), dateFrom, dateTo));
            return Results.Ok(result);
        })
        .WithSummary("Dashboard summary: revenue/profit for selected period (default current month), debtor debt, stock count, 12-month chart data");

        return app;
    }
}
