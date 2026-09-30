using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Counterparties.Queries.GetCounterparties;

public class GetCounterpartiesQueryHandler(IAppDbContext db)
    : IRequestHandler<GetCounterpartiesQuery, PagedResult<CounterpartyDto>>
{
    public async Task<PagedResult<CounterpartyDto>> Handle(
        GetCounterpartiesQuery request, CancellationToken cancellationToken)
    {
        var query = db.Counterparties
            .Where(c => c.CompanyId == request.CompanyId && c.DeletedAt == null);

        // «Both» — и клиент, и поставщик: попадает в оба фильтра.
        if (request.Type.HasValue)
            query = query.Where(c => c.Type == request.Type.Value || c.Type == CounterpartyType.Both);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(c =>
                c.Name.ToLower().Contains(search) ||
                (c.Phone != null && c.Phone.ToLower().Contains(search)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var pageSize = request.PageSize > 0 ? request.PageSize : 20;
        var page = request.Page > 0 ? request.Page : 1;

        var items = await query
            .OrderBy(c => c.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CounterpartyDto(
                c.Id,
                c.CompanyId,
                c.Type.ToString(),
                c.Name,
                c.Phone,
                c.Address,
                c.CreditLimit,
                c.Balance,
                c.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<CounterpartyDto>(items, totalCount, page, pageSize);
    }
}
