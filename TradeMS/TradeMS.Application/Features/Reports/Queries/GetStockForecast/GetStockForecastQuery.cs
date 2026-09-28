using MediatR;
using TradeMS.Application.Features.Reports.DTOs;

namespace TradeMS.Application.Features.Reports.Queries.GetStockForecast;

/// <param name="LookbackDays">За сколько последних дней считать средний темп продаж.</param>
/// <param name="Limit">Сколько товаров вернуть — ближайшие к исчерпанию первыми.</param>
public record GetStockForecastQuery(
    Guid CompanyId,
    Guid? BranchId = null,
    int LookbackDays = 30,
    int Limit = 20) : IRequest<StockForecastDto>;
