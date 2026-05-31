using MediatR;

namespace TradeMS.Application.Features.Accounts.Commands.DeleteAccount;

public record DeleteAccountCommand(Guid Id, Guid CompanyId) : IRequest;
