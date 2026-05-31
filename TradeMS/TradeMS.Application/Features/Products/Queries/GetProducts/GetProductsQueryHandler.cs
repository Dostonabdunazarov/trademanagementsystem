using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Queries.GetProducts;

public class GetProductsQueryHandler(IAppDbContext db)
    : IRequestHandler<GetProductsQuery, PagedResult<ProductDto>>
{
    public async Task<PagedResult<ProductDto>> Handle(GetProductsQuery request, CancellationToken cancellationToken)
    {
        var query = db.Products
            .Include(p => p.Group)
            .Include(p => p.Currency)
            .Where(p => p.CompanyId == request.CompanyId);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(p =>
                p.Name.ToLower().Contains(search) ||
                (p.Sku != null && p.Sku.ToLower().Contains(search)) ||
                (p.Barcode != null && p.Barcode.ToLower().Contains(search)));
        }

        if (request.GroupId.HasValue)
            query = query.Where(p => p.GroupId == request.GroupId);

        var totalCount = await query.CountAsync(cancellationToken);

        var pageSize = request.PageSize > 0 ? request.PageSize : 20;
        var page = request.Page > 0 ? request.Page : 1;

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductDto(
                p.Id,
                p.CompanyId,
                p.GroupId,
                p.Group != null ? p.Group.Name : null,
                p.Name,
                p.Sku,
                p.Barcode,
                p.Unit.ToString(),
                p.PriceSell,
                p.PriceBuy,
                p.CurrencyId,
                p.Currency.Code,
                p.IsActive
            ))
            .ToListAsync(cancellationToken);

        return new PagedResult<ProductDto>(items, totalCount, page, pageSize);
    }
}
