using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Products.Commands.DeleteProduct;

public class DeleteProductCommandHandler(IAppDbContext db, IAuditLogger auditLogger) : IRequestHandler<DeleteProductCommand>
{
    public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await db.Products
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.CompanyId == request.CompanyId, cancellationToken)
            ?? throw new KeyNotFoundException($"Product {request.Id} not found");

        // Guard against cascade data-loss: a product used in any document must not be hard-deleted,
        // otherwise its DocumentLines (and thus historical financial records) would be cascaded away.
        var isReferenced = await db.DocumentLines
            .AnyAsync(l => l.ProductId == request.Id, cancellationToken);
        if (isReferenced)
            throw new InvalidOperationException(
                "Cannot delete a product that is used in documents.");

        var hasStock = await db.Stocks
            .AnyAsync(s => s.ProductId == request.Id && s.Quantity != 0, cancellationToken);
        if (hasStock)
            throw new InvalidOperationException(
                "Cannot delete a product that still has stock.");

        var snapshot = JsonSerializer.Serialize(new { name = product.Name, sku = product.Sku });

        db.Products.Remove(product);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.ProductDelete,
            entityType: "Product", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
