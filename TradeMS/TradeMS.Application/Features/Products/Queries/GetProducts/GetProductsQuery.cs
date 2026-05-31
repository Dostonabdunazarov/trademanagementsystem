using MediatR;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Queries.GetProducts;

public record GetProductsQuery(
    Guid CompanyId,
    string? Search,
    Guid? GroupId,
    int Page,
    int PageSize
) : IRequest<PagedResult<ProductDto>>;
