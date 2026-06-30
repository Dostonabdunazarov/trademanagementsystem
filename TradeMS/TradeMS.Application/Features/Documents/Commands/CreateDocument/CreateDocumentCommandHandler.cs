using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
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
        var prefix = request.Type switch
        {
            DocumentType.Expense            => "EXP",
            DocumentType.Income             => "INC",
            DocumentType.ReturnFromCustomer => "RFC",
            DocumentType.ReturnToSupplier   => "RTS",
            DocumentType.PayOut             => "POT",
            DocumentType.PayIn              => "PIN",
            _ => "DOC"
        };

        var year = request.Date.Year;
        var count = await db.Documents
            .Where(d => d.CompanyId == request.CompanyId && d.Type == request.Type
                        && d.Date.Year == year)
            .CountAsync(cancellationToken);

        var number = $"{prefix}-{year}-{(count + 1):D5}";

        bool isPayment = request.Type is DocumentType.PayOut or DocumentType.PayIn;

        decimal totalAmount;
        List<DocumentLine> lines;
        decimal discountAmount;

        if (isPayment)
        {
            totalAmount = request.Amount ?? 0m;
            discountAmount = 0m;
            lines = [];
        }
        else
        {
            lines = BuildLines(request.Lines, request.ExchangeRate);
            var subtotal = lines.Sum(l => l.Total);
            discountAmount = Money(subtotal * (request.DiscountPercent / 100m));
            totalAmount = subtotal - discountAmount;
        }

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
            TotalAmountBase = Money(totalAmount * request.ExchangeRate),
            Note          = request.Note,
            Amount        = isPayment ? request.Amount : null,
            PaymentMethod = isPayment ? Enum.TryParse<PaymentMethod>(request.PaymentMethod, true, out var pm) ? pm : null : null,
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

        return await BuildDto(doc.Id, request.CompanyId, cancellationToken);
    }

    /// <summary>Rounds a monetary value to 2 decimal places (currency scale).</summary>
    internal static decimal Money(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    private static List<DocumentLine> BuildLines(
        IReadOnlyList<CreateDocumentLineRequest> requests, decimal exchangeRate)
    {
        return requests.Select(r =>
        {
            var discountPrice = Money(r.Price * (1 - r.DiscountPercent / 100m));
            return new DocumentLine
            {
                ProductId      = r.ProductId,
                Quantity       = r.Quantity,
                Price          = r.Price,
                DiscountPercent = r.DiscountPercent,
                DiscountPrice  = discountPrice,
                Total          = Money(r.Quantity * discountPrice),
            };
        }).ToList();
    }

    private async Task<DocumentDto> BuildDto(
        long docId, Guid companyId, CancellationToken ct)
    {
        var doc = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Account)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == docId && d.CompanyId == companyId, ct);

        return MapToDto(doc);
    }

    internal static DocumentDto MapToDto(Document doc) => new(
        doc.Id,
        doc.CompanyId,
        doc.BranchId,
        doc.Type.ToString(),
        doc.Number,
        doc.Date,
        doc.CounterpartyId,
        doc.Counterparty?.Name,
        doc.CurrencyId,
        doc.Currency.Code,
        doc.ExchangeRate,
        doc.TotalAmount,
        doc.TotalAmountBase,
        doc.DiscountPercent,
        doc.DiscountAmount,
        doc.Note,
        doc.Amount,
        doc.PaymentMethod?.ToString(),
        doc.AccountId,
        doc.Account?.Name,
        doc.Status.ToString(),
        doc.CreatedBy,
        doc.CreatedAt,
        doc.ConfirmedAt,
        doc.Lines.Select(l => new DocumentLineDto(
            l.Id,
            l.ProductId,
            l.Product.Name,
            l.Quantity,
            l.Product.Unit.ToString(),
            l.Price,
            l.DiscountPercent,
            l.DiscountPrice,
            l.Total
        )).ToList()
    );
}
