using MediatR;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Products.Commands.CreateProduct;

public record CreateProductCommand(
    Guid CompanyId,
    Guid? GroupId,
    string Name,
    string? Sku,
    string? Barcode,
    ProductUnit Unit,
    decimal PriceSell,
    decimal PriceBuy,
    Guid CurrencyId
) : IRequest<ProductDto>;
