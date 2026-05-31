using MediatR;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Commands.ConfirmDocument;

public record ConfirmDocumentCommand(long Id, Guid CompanyId, Guid? BranchId) : IRequest<DocumentDto>;
