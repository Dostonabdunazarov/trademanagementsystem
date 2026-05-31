using MediatR;

namespace TradeMS.Application.Features.Counterparties.Commands.DeleteCounterparty;

public record DeleteCounterpartyCommand(Guid Id, Guid CompanyId) : IRequest;
