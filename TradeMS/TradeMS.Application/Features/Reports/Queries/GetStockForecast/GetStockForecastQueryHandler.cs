using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Time;
using TradeMS.Application.Features.Reports.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Reports.Queries.GetStockForecast;

/// <summary>
/// Прогноз исчерпания остатков: средний темп продаж за последние LookbackDays
/// (подтверждённые продажи минус возвраты от клиентов) и на сколько дней хватит
/// текущего остатка. В выборку попадают только товары, которые продавались за период:
/// для непродающихся прогноз не имеет смысла.
/// </summary>
public class GetStockForecastQueryHandler(IAppDbContext db)
    : IRequestHandler<GetStockForecastQuery, StockForecastDto>
{
    public async Task<StockForecastDto> Handle(
        GetStockForecastQuery request, CancellationToken cancellationToken)
    {
        var days = Math.Clamp(request.LookbackDays, 7, 180);
        var limit = Math.Clamp(request.Limit, 1, 100);
        var today = BusinessClock.Today;
        var since = today.AddDays(-(days - 1));

        var sold = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                (l.Document.Type == DocumentType.Expense || l.Document.Type == DocumentType.ReturnFromCustomer) &&
                l.Document.Date >= since &&
                l.Document.Date <= today &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .GroupBy(l => new { l.ProductId, l.Product.Name, l.Product.Unit })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.Name,
                g.Key.Unit,
                Quantity = g.Sum(l => l.Document.Type == DocumentType.Expense ? l.Quantity : -l.Quantity),
            })
            .Where(x => x.Quantity > 0)
            .ToListAsync(cancellationToken);

        if (sold.Count == 0)
            return new StockForecastDto(days, []);

        var productIds = sold.Select(s => s.ProductId).ToList();
        var stock = await db.Stocks
            .Where(s =>
                productIds.Contains(s.ProductId) &&
                (!request.BranchId.HasValue || s.BranchId == request.BranchId.Value))
            .GroupBy(s => s.ProductId)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(s => s.Quantity) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Quantity, cancellationToken);

        var lines = sold
            .Select(s =>
            {
                var onHand = Math.Max(0m, stock.GetValueOrDefault(s.ProductId));
                var perDay = s.Quantity / days;
                return new StockForecastLineDto(
                    s.ProductId,
                    s.Name,
                    s.Unit.ToString(),
                    onHand,
                    Math.Round(perDay, 2),
                    Math.Round(onHand / perDay, 1));
            })
            .OrderBy(l => l.DaysLeft)
            .ThenByDescending(l => l.SoldPerDay)
            .Take(limit)
            .ToList();

        return new StockForecastDto(days, lines);
    }
}
