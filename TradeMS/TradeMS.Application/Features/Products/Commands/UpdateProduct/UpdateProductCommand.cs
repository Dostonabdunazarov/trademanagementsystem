using MediatR;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Products.Commands.UpdateProduct;

public record UpdateProductCommand(
    Guid Id,
    Guid CompanyId,
    Guid? GroupId,
    string Name,
    string? Sku,
    string? Barcode,
    ProductUnit Unit,
    decimal PriceSell,
    decimal PriceBuy,
    Guid CurrencyId,
    bool IsActive
) : IRequest<ProductDto>;
