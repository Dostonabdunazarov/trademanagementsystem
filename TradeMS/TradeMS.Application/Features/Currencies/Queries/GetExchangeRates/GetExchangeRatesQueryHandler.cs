using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Currencies.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Currencies.Queries.GetExchangeRates;

public class GetExchangeRatesQueryHandler(IAppDbContext db)
    : IRequestHandler<GetExchangeRatesQuery, IReadOnlyList<ExchangeRateDto>>
{
    public async Task<IReadOnlyList<ExchangeRateDto>> Handle(
        GetExchangeRatesQuery request, CancellationToken cancellationToken)
    {
        IQueryable<ExchangeRate> query;

        if (request.Date.HasValue)
        {
            query = db.ExchangeRates
                .Include(r => r.FromCurrency)
                .Include(r => r.ToCurrency)
                .Where(r => r.Date == request.Date.Value);
        }
        else
        {
            // последний курс на каждую пару: subquery через Date == MAX(Date) для той же пары
            query = db.ExchangeRates
                .Include(r => r.FromCurrency)
                .Include(r => r.ToCurrency)
                .Where(r => r.Date == db.ExchangeRates
                    .Where(x => x.FromCurrencyId == r.FromCurrencyId &&
                                x.ToCurrencyId   == r.ToCurrencyId)
                    .Max(x => x.Date));
        }

        return await query
            .OrderBy(r => r.FromCurrency.Code)
            .ThenBy(r => r.ToCurrency.Code)
            .Select(r => new ExchangeRateDto(
                r.Id,
                r.FromCurrencyId, r.FromCurrency.Code,
                r.ToCurrencyId,   r.ToCurrency.Code,
                r.Rate, r.Date))
            .ToListAsync(cancellationToken);
    }
}
