using MediatR;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Queries.GetDocumentById;

/// <param name="BranchId">Филиал не-админа: документ другого филиала не отдаётся.</param>
public record GetDocumentByIdQuery(long Id, Guid CompanyId, Guid? BranchId = null) : IRequest<DocumentDto?>;
