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
            .Include(d => d.Account)
            .Include(d => d.Lines)
                .ThenInclude(l => l.Product)
            .AsNoTracking()
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId &&
                                      (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value),
                cancellationToken);

        if (doc is null) return null;

        return DocumentRules.MapToDto(doc);
    }
}
