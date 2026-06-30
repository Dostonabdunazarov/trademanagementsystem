using MediatR;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Commands.CancelDocument;

public record CancelDocumentCommand(long Id, Guid CompanyId, Guid? BranchId) : IRequest<DocumentDto>;
