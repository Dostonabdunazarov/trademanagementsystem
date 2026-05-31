using MediatR;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Counterparties.Commands.UpdateCounterparty;

public record UpdateCounterpartyCommand(
    Guid Id,
    Guid CompanyId,
    CounterpartyType Type,
    string Name,
    string? Phone,
    string? Address,
    decimal CreditLimit
) : IRequest<CounterpartyDto>;
