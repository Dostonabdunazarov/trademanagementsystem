using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Queries.GetProductById;

public class GetProductByIdQueryHandler(IAppDbContext db)
    : IRequestHandler<GetProductByIdQuery, ProductDto>
{
    public async Task<ProductDto> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(p => p.Group)
            .Include(p => p.Currency)
            .FirstOrDefaultAsync(
                p => p.Id == request.Id && p.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Product {request.Id} not found");

        return new ProductDto(
            product.Id,
            product.CompanyId,
            product.GroupId,
            product.Group?.Name,
            product.Name,
            product.Sku,
            product.Barcode,
            product.Unit.ToString(),
            product.PriceSell,
            product.PriceBuy,
            product.CurrencyId,
            product.Currency.Code,
            product.IsActive
        );
    }
}
