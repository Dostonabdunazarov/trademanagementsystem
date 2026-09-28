using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.UpdateDocument;

public class UpdateDocumentCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
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
            throw new BusinessException(DocumentErrorCodes.NotDraft, "Only Draft documents can be updated",
                new Dictionary<string, object?> { ["status"] = doc.Status.ToString() });

        doc.Date           = request.Date;
        doc.CounterpartyId = request.CounterpartyId;
        doc.CurrencyId     = request.CurrencyId;
        doc.ExchangeRate   = request.ExchangeRate;
        doc.DiscountPercent = request.DiscountPercent;
        doc.Note           = request.Note;

        db.DocumentLines.RemoveRange(doc.Lines);

        var lines = request.Lines.Select(r =>
        {
            var discountPrice = CreateDocumentCommandHandler.Money(r.Price * (1 - r.DiscountPercent / 100m));
            return new DocumentLine
            {
                DocumentId      = doc.Id,
                ProductId       = r.ProductId,
                Quantity        = r.Quantity,
                Price           = r.Price,
                DiscountPercent = r.DiscountPercent,
                DiscountPrice   = discountPrice,
                Total           = CreateDocumentCommandHandler.Money(r.Quantity * discountPrice),
            };
        }).ToList();

        var subtotal = lines.Sum(l => l.Total);
        var discountAmount = CreateDocumentCommandHandler.Money(subtotal * (request.DiscountPercent / 100m));
        var totalAmount = subtotal - discountAmount;

        doc.Lines           = lines;
        doc.DiscountAmount  = discountAmount;
        doc.TotalAmount     = totalAmount;
        doc.TotalAmountBase = CreateDocumentCommandHandler.Money(totalAmount * request.ExchangeRate);

        await db.SaveChangesAsync(cancellationToken);

        var updated = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == request.Id, cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocUpdate,
            entityType: "Document", entityId: request.Id.ToString(),
            cancellationToken: cancellationToken);

        return CreateDocumentCommandHandler.MapToDto(updated);
    }
}
