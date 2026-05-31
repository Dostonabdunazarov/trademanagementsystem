using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Currencies.DTOs;

namespace TradeMS.Application.Features.Currencies.Queries.GetCurrencies;

public class GetCurrenciesQueryHandler(IAppDbContext db)
    : IRequestHandler<GetCurrenciesQuery, IReadOnlyList<CurrencyDto>>
{
    public async Task<IReadOnlyList<CurrencyDto>> Handle(
        GetCurrenciesQuery request, CancellationToken cancellationToken)
    {
        return await db.Currencies
            .OrderBy(c => c.IsBase ? 0 : 1)
            .ThenBy(c => c.Code)
            .Select(c => new CurrencyDto(c.Id, c.Code, c.Name, c.IsBase))
            .ToListAsync(cancellationToken);
    }
}
