using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Accounts.DTOs;

namespace TradeMS.Application.Features.Accounts.Queries.GetAccounts;

public class GetAccountsQueryHandler(IAppDbContext db)
    : IRequestHandler<GetAccountsQuery, List<AccountDto>>
{
    public async Task<List<AccountDto>> Handle(
        GetAccountsQuery request, CancellationToken cancellationToken)
    {
        var query = db.Accounts
            .Include(a => a.Currency)
            .Where(a => a.CompanyId == request.CompanyId);

        if (request.BranchId.HasValue)
            query = query.Where(a => a.BranchId == request.BranchId.Value);

        return await query
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Name)
            .Select(a => new AccountDto(
                a.Id,
                a.CompanyId,
                a.BranchId,
                a.Name,
                a.Type.ToString(),
                a.CurrencyId,
                a.Currency.Code,
                a.Balance
            ))
            .ToListAsync(cancellationToken);
    }
}
