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

    // Aggregates calculated for a given date range — used for both the selected period
    // and the immediately preceding comparable period (for percentage deltas).
    private record PeriodStats(
        decimal Revenue, decimal Profit, decimal CashIn, decimal CashOut, int SalesCount)
    {
        public decimal CashFlow => CashIn - CashOut;
    }

    public async Task<DashboardSummaryDto> Handle(
        GetDashboardSummaryQuery request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // Period for revenue/profit — defaults to the current month if not specified
        var periodFrom = request.DateFrom ?? new DateOnly(today.Year, today.Month, 1);
        var periodTo = request.DateTo ?? today;

        // Current period aggregates
        var current = await ComputePeriodStats(request, periodFrom, periodTo, cancellationToken);

        // Previous comparable period: same length, immediately preceding `periodFrom`
        var periodLength = periodTo.DayNumber - periodFrom.DayNumber; // inclusive span in days
        var prevTo = periodFrom.AddDays(-1);
        var prevFrom = prevTo.AddDays(-periodLength);
        var previous = await ComputePeriodStats(request, prevFrom, prevTo, cancellationToken);

        var averageCheck = current.SalesCount > 0
            ? current.Revenue / current.SalesCount
            : 0m;

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

        // Creditor debt: what we owe suppliers — mirror of the debtor logic.
        // Income increases our debt; ReturnToSupplier and PayIn reduce it. Returned as a
        // positive amount (how much we owe).
        var creditorDebt = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Counterparty!.Type == CounterpartyType.Supplier &&
                (d.Type == DocumentType.Income ||
                 d.Type == DocumentType.ReturnToSupplier ||
                 d.Type == DocumentType.PayIn) &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .SumAsync(d =>
                d.Type == DocumentType.Income
                    ? d.TotalAmountBase
                    : -d.TotalAmountBase,
                cancellationToken);

        // Stock item count and total buy value (cost of inventory on hand)
        var stockAgg = await db.Stocks
            .Where(s => s.Product.CompanyId == request.CompanyId && s.Quantity > 0 &&
                        (!request.BranchId.HasValue || s.BranchId == request.BranchId.Value))
            .GroupBy(s => 1)
            .Select(g => new
            {
                Count = g.LongCount(),
                BuyValue = g.Sum(s => s.Quantity * s.Product.PriceBuy),
            })
            .FirstOrDefaultAsync(cancellationToken);

        var stockItemCount = stockAgg?.Count ?? 0L;
        var stockBuyValue = stockAgg?.BuyValue ?? 0m;

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

        var dailySales = await ComputeDailySales(request, periodFrom, periodTo, cancellationToken);

        return new DashboardSummaryDto(
            periodFrom, periodTo,
            current.Revenue, current.Profit, debtorDebt, stockItemCount,
            creditorDebt,
            current.CashIn, current.CashOut,
            current.SalesCount, averageCheck,
            stockBuyValue,
            PercentDelta(current.Revenue, previous.Revenue),
            PercentDelta(current.Profit, previous.Profit),
            PercentDelta(current.CashFlow, previous.CashFlow),
            PercentDelta(current.SalesCount, previous.SalesCount),
            monthlySales,
            dailySales);
    }

    // Дневной ряд строим только для периодов до квартала: на году точки сливаются,
    // там достаточно помесячного графика.
    private const int MaxDailyPeriodDays = 92;

    private async Task<IReadOnlyList<DailySalesDto>> ComputeDailySales(
        GetDashboardSummaryQuery request, DateOnly from, DateOnly to, CancellationToken ct)
    {
        if (to < from || to.DayNumber - from.DayNumber + 1 > MaxDailyPeriodDays)
            return [];

        var raw = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                l.Document.Type == DocumentType.Expense &&
                l.Document.Date >= from &&
                l.Document.Date <= to &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .GroupBy(l => l.Document.Date)
            .Select(g => new
            {
                Date = g.Key,
                Revenue = g.Sum(l => l.Total),
                Cost = g.Sum(l => l.Quantity * l.Product.PriceBuy),
            })
            .ToListAsync(ct);

        var byDate = raw.ToDictionary(r => r.Date);

        // Полный ряд без пропусков: дни без продаж — нули, иначе линия графика «перепрыгивает» их.
        var result = new List<DailySalesDto>(to.DayNumber - from.DayNumber + 1);
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            var found = byDate.GetValueOrDefault(d);
            var revenue = found?.Revenue ?? 0m;
            result.Add(new DailySalesDto(d, revenue, revenue - (found?.Cost ?? 0m)));
        }
        return result;
    }

    private async Task<PeriodStats> ComputePeriodStats(
        GetDashboardSummaryQuery request, DateOnly from, DateOnly to, CancellationToken ct)
    {
        // Revenue and profit — calculated from document lines for consistency
        var lines = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                l.Document.Type == DocumentType.Expense &&
                l.Document.Date >= from &&
                l.Document.Date <= to &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .Select(l => new { l.Total, Cost = l.Quantity * l.Product.PriceBuy })
            .ToListAsync(ct);

        var revenue = lines.Sum(l => l.Total);
        var profit = revenue - lines.Sum(l => l.Cost);

        // Number of confirmed sales (Expense documents) in the period
        var salesCount = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Type == DocumentType.Expense &&
                d.Date >= from && d.Date <= to &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .CountAsync(ct);

        // Cash flow: PayIn (money received) and PayOut (money paid out) in the period
        var cashIn = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Type == DocumentType.PayIn &&
                d.Date >= from && d.Date <= to &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .SumAsync(d => d.TotalAmountBase, ct);

        var cashOut = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Type == DocumentType.PayOut &&
                d.Date >= from && d.Date <= to &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .SumAsync(d => d.TotalAmountBase, ct);

        return new PeriodStats(revenue, profit, cashIn, cashOut, salesCount);
    }

    // Percentage change of `current` vs `previous`, rounded to 1 decimal place.
    // Returns null when there is no comparable base (previous == 0).
    private static decimal? PercentDelta(decimal current, decimal previous)
    {
        if (previous == 0m)
            return null;
        return Math.Round((current - previous) / Math.Abs(previous) * 100m, 1);
    }
}
