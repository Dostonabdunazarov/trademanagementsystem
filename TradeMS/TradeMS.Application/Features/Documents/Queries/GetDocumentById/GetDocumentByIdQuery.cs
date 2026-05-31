using MediatR;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Queries.GetDocumentById;

public record GetDocumentByIdQuery(long Id, Guid CompanyId) : IRequest<DocumentDto?>;
