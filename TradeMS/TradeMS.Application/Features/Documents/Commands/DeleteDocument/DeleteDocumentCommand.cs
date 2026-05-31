using MediatR;

namespace TradeMS.Application.Features.Documents.Commands.DeleteDocument;

public record DeleteDocumentCommand(long Id, Guid CompanyId, Guid? BranchId) : IRequest;
