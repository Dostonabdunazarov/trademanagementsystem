using MediatR;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.CreateDocument;

public record CreateDocumentCommand(
    Guid CompanyId,
    Guid BranchId,
    Guid CreatedBy,
    DocumentType Type,
    DateOnly Date,
    Guid? CounterpartyId,
    Guid CurrencyId,
    decimal ExchangeRate,
    decimal DiscountPercent,
    string? Note,
    IReadOnlyList<CreateDocumentLineRequest> Lines
) : IRequest<DocumentDto>;
