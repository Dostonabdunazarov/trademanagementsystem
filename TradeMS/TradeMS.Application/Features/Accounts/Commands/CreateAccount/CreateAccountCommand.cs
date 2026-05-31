using MediatR;
using TradeMS.Application.Features.Accounts.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Accounts.Commands.CreateAccount;

public record CreateAccountCommand(
    Guid CompanyId,
    Guid BranchId,
    string Name,
    AccountType Type,
    Guid CurrencyId
) : IRequest<AccountDto>;
