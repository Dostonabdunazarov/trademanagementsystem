using MediatR;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Queries.GetProductGroups;

public record GetProductGroupsQuery(Guid CompanyId) : IRequest<List<ProductGroupDto>>;
