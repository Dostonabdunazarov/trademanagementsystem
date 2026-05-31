using MediatR;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Counterparties.Commands.CreateCounterparty;

public record CreateCounterpartyCommand(
    Guid CompanyId,
    CounterpartyType Type,
    string Name,
    string? Phone,
    string? Address,
    decimal CreditLimit
) : IRequest<CounterpartyDto>;
