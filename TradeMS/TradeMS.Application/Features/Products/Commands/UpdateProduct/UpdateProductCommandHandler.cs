using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Commands.UpdateProduct;

public class UpdateProductCommandHandler(IAppDbContext db)
    : IRequestHandler<UpdateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .Include(p => p.Currency)
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken)
            ?? throw new KeyNotFoundException($"Product {request.Id} not found");

        var currency = await db.Currencies
            .FirstOrDefaultAsync(c => c.Id == request.CurrencyId, cancellationToken)
            ?? throw new KeyNotFoundException("Currency not found");

        if (request.GroupId.HasValue)
        {
            _ = await db.ProductGroups
                .FirstOrDefaultAsync(g => g.Id == request.GroupId && g.CompanyId == request.CompanyId, cancellationToken)
                ?? throw new KeyNotFoundException("Product group not found");
        }

        product.GroupId = request.GroupId;
        product.Name = request.Name;
        product.Sku = request.Sku;
        product.Barcode = request.Barcode;
        product.Unit = request.Unit;
        product.PriceSell = request.PriceSell;
        product.PriceBuy = request.PriceBuy;
        product.CurrencyId = request.CurrencyId;
        product.IsActive = request.IsActive;

        await db.SaveChangesAsync(cancellationToken);

        string? groupName = null;
        if (product.GroupId.HasValue)
        {
            var group = await db.ProductGroups
                .FirstOrDefaultAsync(g => g.Id == product.GroupId, cancellationToken);
            groupName = group?.Name;
        }

        return new ProductDto(
            product.Id,
            product.CompanyId,
            product.GroupId,
            groupName,
            product.Name,
            product.Sku,
            product.Barcode,
            product.Unit.ToString(),
            product.PriceSell,
            product.PriceBuy,
            product.CurrencyId,
            currency.Code,
            product.IsActive
        );
    }
}
