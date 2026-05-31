using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Products.DTOs;

public record ProductGroupDto(Guid Id, string Name, Guid? ParentId, List<ProductGroupDto> Children);

public record ProductDto(
    Guid Id,
    Guid CompanyId,
    Guid? GroupId,
    string? GroupName,
    string Name,
    string? Sku,
    string? Barcode,
    string Unit,
    decimal PriceSell,
    decimal PriceBuy,
    Guid CurrencyId,
    string CurrencyCode,
    bool IsActive
);

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);

public record CreateProductGroupRequest(string Name, Guid? ParentId);

public record CreateProductRequest(
    Guid? GroupId,
    string Name,
    string? Sku,
    string? Barcode,
    ProductUnit Unit,
    decimal PriceSell,
    decimal PriceBuy,
    Guid CurrencyId
);

public record UpdateProductRequest(
    Guid? GroupId,
    string Name,
    string? Sku,
    string? Barcode,
    ProductUnit Unit,
    decimal PriceSell,
    decimal PriceBuy,
    Guid CurrencyId,
    bool IsActive
);
