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

        var snapshot = JsonSerializer.Serialize(new { name = product.Name, sku = product.Sku });

        db.Products.Remove(product);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.ProductDelete,
            entityType: "Product", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
