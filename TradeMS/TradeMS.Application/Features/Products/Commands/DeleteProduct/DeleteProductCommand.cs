using MediatR;

namespace TradeMS.Application.Features.Products.Commands.DeleteProduct;

public record DeleteProductCommand(Guid Id, Guid CompanyId) : IRequest;
