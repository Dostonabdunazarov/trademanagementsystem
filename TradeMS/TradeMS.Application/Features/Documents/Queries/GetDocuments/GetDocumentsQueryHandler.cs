using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Queries.GetDocuments;

public class GetDocumentsQueryHandler(IAppDbContext db)
    : IRequestHandler<GetDocumentsQuery, GetDocumentsResult>
{
    public async Task<GetDocumentsResult> Handle(
        GetDocumentsQuery request, CancellationToken cancellationToken)
    {
        var query = db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Where(d => d.CompanyId == request.CompanyId);

        if (!string.IsNullOrWhiteSpace(request.Type) &&
            Enum.TryParse<DocumentType>(request.Type, true, out var docType))
            query = query.Where(d => d.Type == docType);

        if (request.DateFrom.HasValue)
            query = query.Where(d => d.Date >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(d => d.Date <= request.DateTo.Value);

        if (!string.IsNullOrWhiteSpace(request.Status) &&
            Enum.TryParse<DocumentStatus>(request.Status, true, out var docStatus))
            query = query.Where(d => d.Status == docStatus);

        if (request.BranchId.HasValue)
            query = query.Where(d => d.BranchId == request.BranchId.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(d => d.Date)
            .ThenByDescending(d => d.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(d => new DocumentSummaryDto(
                d.Id,
                d.Type.ToString(),
                d.Number,
                d.Date,
                d.Counterparty != null ? d.Counterparty.Name : null,
                d.Currency.Code,
                d.TotalAmount,
                d.DiscountAmount,
                d.Status.ToString(),
                d.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return new GetDocumentsResult(items, total, request.Page, request.PageSize);
    }
}
