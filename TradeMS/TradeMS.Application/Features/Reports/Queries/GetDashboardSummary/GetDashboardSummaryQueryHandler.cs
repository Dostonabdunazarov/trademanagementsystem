using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Time;
using TradeMS.Application.Features.Reports.DTOs;
using TradeMS.Domain.Entities;
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
        var today = BusinessClock.Today;

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

        // Долги считаем той же таблицей знаков, что и Balance контрагента
        // (ConfirmDocumentCommandHandler): Expense, ReturnToSupplier, PayOut — плюс,
        // Income, ReturnFromCustomer, PayIn — минус. Сальдо считается по каждому контрагенту
        // отдельно: предоплата одного клиента не должна «гасить» долг другого. Тип контрагента
        // не важен — «Both» может быть и должником, и кредитором. Удалённые не учитываются,
        // как и в отчёте /reports/counterparty-balance. Фильтр по филиалу — по документам.
        var balances = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.CounterpartyId != null &&
                d.Counterparty!.DeletedAt == null &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .GroupBy(d => d.CounterpartyId)
            .Select(g => g.Sum(d =>
                d.Type == DocumentType.Expense || d.Type == DocumentType.ReturnToSupplier || d.Type == DocumentType.PayOut
                    ? d.TotalAmountBase
                    : -d.TotalAmountBase))
            .ToListAsync(cancellationToken);

        // Дебиторка — сколько нам должны; кредиторка — сколько должны мы (положительным числом).
        var debtorDebt = balances.Where(b => b > 0).Sum();
        var creditorDebt = -balances.Where(b => b < 0).Sum();

        // Stock item count and total buy value (cost of inventory on hand) — закупочные цены
        // в валюте товара, поэтому суммы по валютам переводятся в базовую по текущему курсу.
        var stockByCurrency = await db.Stocks
            .Where(s => s.Product.CompanyId == request.CompanyId && s.Quantity > 0 &&
                        (!request.BranchId.HasValue || s.BranchId == request.BranchId.Value))
            .GroupBy(s => s.Product.CurrencyId)
            .Select(g => new
            {
                CurrencyId = g.Key,
                Count = g.LongCount(),
                BuyValue = g.Sum(s => s.Quantity * s.Product.PriceBuy),
            })
            .ToListAsync(cancellationToken);

        var rates = await ReportRates.LoadAsync(db, stockByCurrency.Select(x => x.CurrencyId), today, cancellationToken);
        var stockItemCount = stockByCurrency.Sum(x => x.Count);
        var stockBuyValue = Math.Round(stockByCurrency.Sum(x => x.BuyValue * rates.ToBase(x.CurrencyId)), 2,
            MidpointRounding.AwayFromZero);

        // Monthly sales for last 12 months
        var yearAgo = today.AddMonths(-11);
        var yearStart = new DateOnly(yearAgo.Year, yearAgo.Month, 1);

        // Выручка — TotalAmountBase документа (базовая валюта, с учётом скидки документа),
        // себестоимость — CostBase строк, зафиксированная при проведении.
        var monthlyRevenue = await SalesDocuments(request, yearStart, today)
            .GroupBy(d => new { d.Date.Year, d.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(d => d.TotalAmountBase) })
            .ToListAsync(cancellationToken);
        var monthlyCost = await SalesLines(request, yearStart, today)
            .GroupBy(l => new { l.Document.Date.Year, l.Document.Date.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Cost = g.Sum(l => l.CostBase) })
            .ToListAsync(cancellationToken);

        // Build complete 12-month series, filling missing months with 0
        var monthlySales = new List<MonthlySalesDto>(12);
        for (var i = 11; i >= 0; i--)
        {
            var d = today.AddMonths(-i);
            var monthRevenue = monthlyRevenue.FirstOrDefault(r => r.Year == d.Year && r.Month == d.Month)?.Revenue ?? 0m;
            var monthCost = monthlyCost.FirstOrDefault(r => r.Year == d.Year && r.Month == d.Month)?.Cost ?? 0m;
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

        var revenueByDate = await SalesDocuments(request, from, to)
            .GroupBy(d => d.Date)
            .Select(g => new { Date = g.Key, Revenue = g.Sum(d => d.TotalAmountBase) })
            .ToDictionaryAsync(r => r.Date, r => r.Revenue, ct);
        var costByDate = await SalesLines(request, from, to)
            .GroupBy(l => l.Document.Date)
            .Select(g => new { Date = g.Key, Cost = g.Sum(l => l.CostBase) })
            .ToDictionaryAsync(r => r.Date, r => r.Cost, ct);

        // Полный ряд без пропусков: дни без продаж — нули, иначе линия графика «перепрыгивает» их.
        var result = new List<DailySalesDto>(to.DayNumber - from.DayNumber + 1);
        for (var d = from; d <= to; d = d.AddDays(1))
        {
            var revenue = revenueByDate.GetValueOrDefault(d);
            result.Add(new DailySalesDto(d, revenue, revenue - costByDate.GetValueOrDefault(d)));
        }
        return result;
    }

    private async Task<PeriodStats> ComputePeriodStats(
        GetDashboardSummaryQuery request, DateOnly from, DateOnly to, CancellationToken ct)
    {
        // Revenue — в базовой валюте с учётом скидки документа; profit — минус себестоимость,
        // зафиксированная при проведении. Считается в БД, без выгрузки строк в память.
        var revenue = await SalesDocuments(request, from, to).SumAsync(d => d.TotalAmountBase, ct);
        var cost = await SalesLines(request, from, to).SumAsync(l => l.CostBase, ct);
        var profit = revenue - cost;
        var salesCount = await SalesDocuments(request, from, to).CountAsync(ct);

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

    private IQueryable<Document> SalesDocuments(GetDashboardSummaryQuery request, DateOnly from, DateOnly to) =>
        db.Documents.Where(d =>
            d.CompanyId == request.CompanyId &&
            d.Status == DocumentStatus.Confirmed &&
            d.Type == DocumentType.Expense &&
            d.Date >= from && d.Date <= to &&
            (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value));

    private IQueryable<DocumentLine> SalesLines(GetDashboardSummaryQuery request, DateOnly from, DateOnly to) =>
        db.DocumentLines.Where(l =>
            l.Document.CompanyId == request.CompanyId &&
            l.Document.Status == DocumentStatus.Confirmed &&
            l.Document.Type == DocumentType.Expense &&
            l.Document.Date >= from && l.Document.Date <= to &&
            (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value));

    // Percentage change of `current` vs `previous`, rounded to 1 decimal place.
    // Returns null when there is no comparable base (previous == 0).
    private static decimal? PercentDelta(decimal current, decimal previous)
    {
        if (previous == 0m)
            return null;
        return Math.Round((current - previous) / Math.Abs(previous) * 100m, 1);
    }
}
