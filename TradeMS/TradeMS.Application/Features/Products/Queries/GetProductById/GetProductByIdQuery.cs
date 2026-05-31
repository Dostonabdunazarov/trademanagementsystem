using MediatR;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Queries.GetProductById;

public record GetProductByIdQuery(Guid Id, Guid CompanyId) : IRequest<ProductDto>;
