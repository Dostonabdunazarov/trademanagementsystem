using MediatR;
using TradeMS.Application.Features.Currencies.DTOs;

namespace TradeMS.Application.Features.Currencies.Queries.GetExchangeRates;

public record GetExchangeRatesQuery(DateOnly? Date) : IRequest<IReadOnlyList<ExchangeRateDto>>;
