using MediatR;
using TradeMS.Application.Features.Currencies.DTOs;

namespace TradeMS.Application.Features.Currencies.Commands.CreateCurrency;

public record CreateCurrencyCommand(string Code, string Name, bool IsBase) : IRequest<CurrencyDto>;
