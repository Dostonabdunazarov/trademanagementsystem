using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Products.Commands.CreateProduct;

public class CreateProductCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<CreateProductCommand, ProductDto>
{
    public async Task<ProductDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var currency = await db.Currencies
            .FirstOrDefaultAsync(c => c.Id == request.CurrencyId, cancellationToken)
            ?? throw new KeyNotFoundException("Currency not found");

        if (request.GroupId.HasValue)
        {
            _ = await db.ProductGroups
                .FirstOrDefaultAsync(g => g.Id == request.GroupId && g.CompanyId == request.CompanyId, cancellationToken)
                ?? throw new KeyNotFoundException("Product group not found");
        }

        var product = new Product
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            GroupId = request.GroupId,
            Name = request.Name,
            Sku = request.Sku,
            Barcode = request.Barcode,
            Unit = request.Unit,
            PriceSell = request.PriceSell,
            PriceBuy = request.PriceBuy,
            CurrencyId = request.CurrencyId,
            IsActive = true
        };

        db.Products.Add(product);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.ProductCreate,
            entityType: "Product", entityId: product.Id.ToString(),
            details: JsonSerializer.Serialize(new { name = product.Name }),
            cancellationToken: cancellationToken);

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
