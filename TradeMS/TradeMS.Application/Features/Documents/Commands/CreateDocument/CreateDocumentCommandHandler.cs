using System.Text.Json;
using MediatR;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.CreateDocument;

public class CreateDocumentCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<CreateDocumentCommand, DocumentDto>
{
    public async Task<DocumentDto> Handle(
        CreateDocumentCommand request, CancellationToken cancellationToken)
    {
        var isPayment = DocumentRules.IsPayment(request.Type);

        await DocumentRules.EnsureReferencesAsync(db,
            request.CompanyId, request.BranchId, request.Type,
            request.CounterpartyId, request.CurrencyId, request.AccountId,
            request.Lines.Select(l => l.ProductId).ToList(),
            request.Lines.Select(l => l.Quantity).ToList(),
            cancellationToken);

        List<DocumentLine> lines;
        decimal totalAmount;
        decimal discountAmount;

        if (isPayment)
        {
            totalAmount = DocumentRules.Money(request.Amount ?? 0m);
            discountAmount = 0m;
            lines = [];
        }
        else
        {
            lines = DocumentRules.BuildLines(request.Lines);
            (discountAmount, totalAmount) = DocumentRules.Totals(lines, request.DiscountPercent);
        }

        var number = await DocumentRules.NextNumberAsync(
            db, request.CompanyId, request.Type, request.Date.Year, cancellationToken);

        var doc = new Document
        {
            CompanyId     = request.CompanyId,
            BranchId      = request.BranchId,
            Type          = request.Type,
            Number        = number,
            Date          = request.Date,
            CounterpartyId = request.CounterpartyId,
            CurrencyId    = request.CurrencyId,
            ExchangeRate  = request.ExchangeRate,
            DiscountPercent = isPayment ? 0m : request.DiscountPercent,
            DiscountAmount  = discountAmount,
            TotalAmount     = totalAmount,
            // Предварительная оценка по курсу клиента; при проведении пересчитывается по серверному курсу.
            TotalAmountBase = DocumentRules.Money(totalAmount * request.ExchangeRate),
            Note          = request.Note,
            Amount        = isPayment ? totalAmount : null,
            PaymentMethod = isPayment && Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var pm) ? pm : null,
            AccountId     = isPayment ? request.AccountId : null,
            Status        = DocumentStatus.Draft,
            CreatedBy     = request.CreatedBy,
            CreatedAt     = DateTime.UtcNow,
            Lines         = lines
        };

        db.Documents.Add(doc);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocCreate,
            entityType: "Document", entityId: doc.Id.ToString(),
            details: JsonSerializer.Serialize(new { type = doc.Type.ToString(), number = doc.Number }),
            cancellationToken: cancellationToken);

        return await DocumentRules.LoadDtoAsync(db, doc.Id, request.CompanyId, cancellationToken);
    }
}
