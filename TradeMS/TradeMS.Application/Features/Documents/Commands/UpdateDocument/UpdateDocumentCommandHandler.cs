using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Exceptions;
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
            throw new ForbiddenAccessException("Access to this document is not allowed");

        if (doc.Status != DocumentStatus.Draft)
            throw new BusinessException(DocumentErrorCodes.NotDraft, "Only Draft documents can be updated",
                new Dictionary<string, object?> { ["status"] = doc.Status.ToString() });

        var isPayment = DocumentRules.IsPayment(doc.Type);
        EnsureShape(request, isPayment);

        await DocumentRules.EnsureReferencesAsync(db,
            request.CompanyId, doc.BranchId, doc.Type,
            request.CounterpartyId, request.CurrencyId, request.AccountId,
            request.Lines.Select(l => l.ProductId).ToList(),
            request.Lines.Select(l => l.Quantity).ToList(),
            cancellationToken);

        // Номер несёт год документа: при переносе в другой год выдаём номер из счётчика нового года.
        if (request.Date.Year != doc.Date.Year)
            doc.Number = await DocumentRules.NextNumberAsync(
                db, doc.CompanyId, doc.Type, request.Date.Year, cancellationToken);

        doc.Date           = request.Date;
        doc.CounterpartyId = request.CounterpartyId;
        doc.CurrencyId     = request.CurrencyId;
        doc.ExchangeRate   = request.ExchangeRate;
        doc.Note           = request.Note;
        // Всегда меняем строку документа: xmin сдвигается, и параллельное проведение,
        // успевшее прочитать старые строки, получит конфликт вместо проводки по устаревшим данным.
        doc.UpdatedAt      = DateTime.UtcNow;

        if (isPayment)
        {
            var amount = DocumentRules.Money(request.Amount!.Value);
            doc.Amount          = amount;
            doc.TotalAmount     = amount;
            doc.DiscountPercent = 0m;
            doc.DiscountAmount  = 0m;
            doc.PaymentMethod   = Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var pm) ? pm : null;
            doc.AccountId       = request.AccountId;
        }
        else
        {
            db.DocumentLines.RemoveRange(doc.Lines);

            var lines = DocumentRules.BuildLines(request.Lines);
            foreach (var line in lines)
                line.DocumentId = doc.Id;

            var (discountAmount, totalAmount) = DocumentRules.Totals(lines, request.DiscountPercent);

            doc.Lines           = lines;
            doc.DiscountPercent = request.DiscountPercent;
            doc.DiscountAmount  = discountAmount;
            doc.TotalAmount     = totalAmount;
        }

        doc.TotalAmountBase = DocumentRules.Money(doc.TotalAmount * request.ExchangeRate);

        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocUpdate,
            entityType: "Document", entityId: request.Id.ToString(),
            cancellationToken: cancellationToken);

        return await DocumentRules.LoadDtoAsync(db, request.Id, request.CompanyId, cancellationToken);
    }

    private static void EnsureShape(UpdateDocumentCommand request, bool isPayment)
    {
        var errors = new List<ValidationFailure>();
        if (isPayment)
        {
            if (request.Amount is null)
                errors.Add(new ValidationFailure(nameof(request.Amount), "Amount is required for payment documents")
                    { ErrorCode = DocumentErrorCodes.AmountRequired });
            if (request.AccountId is null)
                errors.Add(new ValidationFailure(nameof(request.AccountId), "Account is required for payment documents")
                    { ErrorCode = DocumentErrorCodes.AccountRequired });
        }
        else if (request.Lines.Count == 0)
        {
            errors.Add(new ValidationFailure(nameof(request.Lines), "At least one line is required")
                { ErrorCode = DocumentErrorCodes.LinesRequired });
        }

        if (errors.Count > 0)
            throw new ValidationException(errors);
    }
}
