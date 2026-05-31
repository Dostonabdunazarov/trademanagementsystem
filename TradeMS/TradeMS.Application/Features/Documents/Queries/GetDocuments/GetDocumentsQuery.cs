using MediatR;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Queries.GetDocuments;

public record GetDocumentsQuery(
    Guid CompanyId,
    string? Type,
    DateOnly? DateFrom,
    DateOnly? DateTo,
    int Page,
    int PageSize,
    string? Status = null,
    Guid? BranchId = null
) : IRequest<GetDocumentsResult>;

public record GetDocumentsResult(
    IReadOnlyList<DocumentSummaryDto> Items,
    int TotalCount,
    int Page,
    int PageSize
);
