using MediatR;
using TradeMS.Application.Features.Currencies.DTOs;

namespace TradeMS.Application.Features.Currencies.Commands.CreateExchangeRate;

public record CreateExchangeRateCommand(
    Guid FromCurrencyId,
    Guid ToCurrencyId,
    decimal Rate,
    DateOnly Date
) : IRequest<ExchangeRateDto>;
