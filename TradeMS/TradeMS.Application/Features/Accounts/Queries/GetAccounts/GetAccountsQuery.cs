using MediatR;
using TradeMS.Application.Features.Accounts.DTOs;

namespace TradeMS.Application.Features.Accounts.Queries.GetAccounts;

public record GetAccountsQuery(Guid CompanyId, Guid? BranchId = null) : IRequest<List<AccountDto>>;
