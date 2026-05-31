using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.UpdateDocument;

public class UpdateDocumentCommandHandler(IAppDbContext db)
    : IRequestHandler<UpdateDocumentCommand, DocumentDto>
{
    public async Task<DocumentDto> Handle(
        UpdateDocumentCommand request, CancellationToken cancellationToken)
    {
        var doc = await db.Documents
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Document {request.Id} not found");

        if (request.BranchId.HasValue && doc.BranchId != request.BranchId.Value)
            throw new UnauthorizedAccessException("Access to this document is not allowed");

        if (doc.Status != DocumentStatus.Draft)
            throw new InvalidOperationException("Only Draft documents can be updated");

        doc.Date           = request.Date;
        doc.CounterpartyId = request.CounterpartyId;
        doc.CurrencyId     = request.CurrencyId;
        doc.ExchangeRate   = request.ExchangeRate;
        doc.DiscountPercent = request.DiscountPercent;
        doc.Note           = request.Note;

        db.DocumentLines.RemoveRange(doc.Lines);

        var lines = request.Lines.Select(r =>
        {
            var discountPrice = r.Price * (1 - r.DiscountPercent / 100m);
            return new DocumentLine
            {
                DocumentId      = doc.Id,
                ProductId       = r.ProductId,
                Quantity        = r.Quantity,
                Price           = r.Price,
                DiscountPercent = r.DiscountPercent,
                DiscountPrice   = discountPrice,
                Total           = r.Quantity * discountPrice,
            };
        }).ToList();

        var subtotal = lines.Sum(l => l.Total);
        var discountAmount = subtotal * (request.DiscountPercent / 100m);
        var totalAmount = subtotal - discountAmount;

        doc.Lines           = lines;
        doc.DiscountAmount  = discountAmount;
        doc.TotalAmount     = totalAmount;
        doc.TotalAmountBase = totalAmount * request.ExchangeRate;

        await db.SaveChangesAsync(cancellationToken);

        var updated = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == request.Id, cancellationToken);

        return CreateDocumentCommandHandler.MapToDto(updated);
    }
}
