using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Reports.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Reports.Queries.GetDashboardSummary;

public class GetDashboardSummaryQueryHandler(IAppDbContext db)
    : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private static readonly string[] MonthLabels =
        ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

    public async Task<DashboardSummaryDto> Handle(
        GetDashboardSummaryQuery request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Period for revenue/profit — defaults to the current month if not specified
        var periodFrom = request.DateFrom ?? new DateOnly(today.Year, today.Month, 1);
        var periodTo = request.DateTo ?? today;

        // Revenue and profit for the selected period — both calculated from document lines for consistency
        var periodLines = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                l.Document.Type == DocumentType.Expense &&
                l.Document.Date >= periodFrom &&
                l.Document.Date <= periodTo &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .Select(l => new { l.Total, Cost = l.Quantity * l.Product.PriceBuy })
            .ToListAsync(cancellationToken);

        var revenue = periodLines.Sum(l => l.Total);
        var profit = revenue - periodLines.Sum(l => l.Cost);

        // Debtor debt: Expense − ReturnFromCustomer − PayOut, filtered by branch if set
        // (mirrors the Balance logic in ConfirmDocumentCommandHandler)
        var debtorDebt = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Counterparty!.Type == CounterpartyType.Customer &&
                d.Type != DocumentType.Income &&
                d.Type != DocumentType.ReturnToSupplier &&
                d.Type != DocumentType.PayIn &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .SumAsync(d =>
                d.Type == DocumentType.Expense
                    ? d.TotalAmountBase
                    : -d.TotalAmountBase,
                cancellationToken);

        // Stock item count
        var stockItemCount = await db.Stocks
            .Where(s => s.Product.CompanyId == request.CompanyId && s.Quantity > 0 &&
                        (!request.BranchId.HasValue || s.BranchId == request.BranchId.Value))
            .LongCountAsync(cancellationToken);

        // Monthly sales for last 12 months
        var yearAgo = today.AddMonths(-11);
        var yearStart = new DateOnly(yearAgo.Year, yearAgo.Month, 1);

        var monthlySalesRaw = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                l.Document.Type == DocumentType.Expense &&
                l.Document.Date >= yearStart &&
                l.Document.Date <= today &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .GroupBy(l => new { l.Document.Date.Year, l.Document.Date.Month })
            .Select(g => new
            {
                g.Key.Year,
                g.Key.Month,
                Revenue = g.Sum(l => l.Total),
                Cost = g.Sum(l => l.Quantity * l.Product.PriceBuy),
            })
            .ToListAsync(cancellationToken);

        // Build complete 12-month series, filling missing months with 0
        var monthlySales = new List<MonthlySalesDto>(12);
        for (var i = 11; i >= 0; i--)
        {
            var d = today.AddMonths(-i);
            var found = monthlySalesRaw.FirstOrDefault(r => r.Year == d.Year && r.Month == d.Month);
            var monthRevenue = found?.Revenue ?? 0m;
            var monthCost = found?.Cost ?? 0m;
            monthlySales.Add(new MonthlySalesDto(
                d.Year, d.Month,
                MonthLabels[d.Month - 1],
                monthRevenue,
                monthRevenue - monthCost
            ));
        }

        return new DashboardSummaryDto(
            periodFrom, periodTo, revenue, profit, debtorDebt, stockItemCount, monthlySales);
    }
}
