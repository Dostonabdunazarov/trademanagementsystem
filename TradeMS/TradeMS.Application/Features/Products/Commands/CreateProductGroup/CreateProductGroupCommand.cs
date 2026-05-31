using MediatR;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Commands.CreateProductGroup;

public record CreateProductGroupCommand(Guid CompanyId, string Name, Guid? ParentId)
    : IRequest<ProductGroupDto>;
