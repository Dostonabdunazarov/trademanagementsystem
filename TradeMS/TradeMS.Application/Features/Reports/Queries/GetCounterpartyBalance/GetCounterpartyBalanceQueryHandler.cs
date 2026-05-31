using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Reports.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Reports.Queries.GetCounterpartyBalance;

public class GetCounterpartyBalanceQueryHandler(IAppDbContext db)
    : IRequestHandler<GetCounterpartyBalanceQuery, CounterpartyBalanceDto>
{
    public async Task<CounterpartyBalanceDto> Handle(
        GetCounterpartyBalanceQuery request, CancellationToken cancellationToken)
    {
        var query = db.Counterparties
            .Where(c => c.CompanyId == request.CompanyId);

        if (!string.IsNullOrWhiteSpace(request.Type) &&
            Enum.TryParse<CounterpartyType>(request.Type, true, out var cpType))
            query = query.Where(c => c.Type == cpType);

        var raw = await query
            .OrderBy(c => c.Name)
            .Select(c => new
            {
                c.Id,
                c.Name,
                Type = c.Type,
                c.Phone,
                c.Balance,
                c.CreditLimit,
            })
            .ToListAsync(cancellationToken);

        var lines = raw.Select(c => new CounterpartyBalanceLineDto(
            c.Id,
            c.Name,
            c.Type.ToString(),
            c.Phone,
            c.Balance,
            c.CreditLimit
        )).ToList();

        // Debit = positive balance (customer owes us), Credit = negative balance (we owe supplier)
        var totalDebit = lines.Where(l => l.Balance > 0).Sum(l => l.Balance);
        var totalCredit = lines.Where(l => l.Balance < 0).Sum(l => Math.Abs(l.Balance));

        return new CounterpartyBalanceDto(totalDebit, totalCredit, lines);
    }
}
