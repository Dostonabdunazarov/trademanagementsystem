using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.DeleteDocument;

public class DeleteDocumentCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<DeleteDocumentCommand>
{
    public async Task Handle(DeleteDocumentCommand request, CancellationToken cancellationToken)
    {
        var doc = await db.Documents
            .Include(d => d.Lines)
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Document {request.Id} not found");

        if (request.BranchId.HasValue && doc.BranchId != request.BranchId.Value)
            throw new UnauthorizedAccessException("Access to this document is not allowed");

        if (doc.Status != DocumentStatus.Draft)
            throw new BusinessException(DocumentErrorCodes.NotDraft, "Only Draft documents can be deleted",
                new Dictionary<string, object?> { ["status"] = doc.Status.ToString() });

        var snapshot = JsonSerializer.Serialize(new { number = doc.Number, type = doc.Type.ToString(), total = doc.TotalAmountBase, date = doc.Date });

        db.DocumentLines.RemoveRange(doc.Lines);
        db.Documents.Remove(doc);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocDelete,
            entityType: "Document", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
