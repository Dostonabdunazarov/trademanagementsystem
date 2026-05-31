using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Queries.GetDocumentById;

public class GetDocumentByIdQueryHandler(IAppDbContext db)
    : IRequestHandler<GetDocumentByIdQuery, DocumentDto?>
{
    public async Task<DocumentDto?> Handle(
        GetDocumentByIdQuery request, CancellationToken cancellationToken)
    {
        var doc = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Lines)
                .ThenInclude(l => l.Product)
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId,
                cancellationToken);

        if (doc is null) return null;

        return new DocumentDto(
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
}
