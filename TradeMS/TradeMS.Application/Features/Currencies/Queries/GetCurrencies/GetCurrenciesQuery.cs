using MediatR;
using TradeMS.Application.Features.Currencies.DTOs;

namespace TradeMS.Application.Features.Currencies.Queries.GetCurrencies;

public record GetCurrenciesQuery : IRequest<IReadOnlyList<CurrencyDto>>;
