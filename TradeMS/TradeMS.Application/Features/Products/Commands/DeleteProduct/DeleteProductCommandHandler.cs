using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;

namespace TradeMS.Application.Features.Products.Commands.DeleteProduct;

public class DeleteProductCommandHandler(IAppDbContext db) : IRequestHandler<DeleteProductCommand>
{
    public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken)
            ?? throw new KeyNotFoundException($"Product {request.Id} not found");

        db.Products.Remove(product);
        await db.SaveChangesAsync(cancellationToken);
    }
}
