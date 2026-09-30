using MediatR;
using TradeMS.Application.Features.Documents.DTOs;

namespace TradeMS.Application.Features.Documents.Commands.UpdateDocument;

public record UpdateDocumentCommand(
    long Id,
    Guid CompanyId,
    Guid? BranchId,
    DateOnly Date,
    Guid? CounterpartyId,
    Guid CurrencyId,
    decimal ExchangeRate,
    decimal DiscountPercent,
    string? Note,
    IReadOnlyList<CreateDocumentLineRequest> Lines,
    decimal? Amount = null,
    string? PaymentMethod = null,
    Guid? AccountId = null
) : IRequest<DocumentDto>;
