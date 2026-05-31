using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.DTOs;

public record DocumentLineDto(
    long Id,
    Guid ProductId,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal Price,
    decimal DiscountPercent,
    decimal DiscountPrice,
    decimal Total
);

public record DocumentDto(
    long Id,
    Guid CompanyId,
    Guid BranchId,
    string Type,
    string Number,
    DateOnly Date,
    Guid? CounterpartyId,
    string? CounterpartyName,
    Guid CurrencyId,
    string CurrencyCode,
    decimal ExchangeRate,
    decimal TotalAmount,
    decimal TotalAmountBase,
    decimal DiscountPercent,
    decimal DiscountAmount,
    string? Note,
    string Status,
    Guid CreatedBy,
    DateTime CreatedAt,
    DateTime? ConfirmedAt,
    IReadOnlyList<DocumentLineDto> Lines
);

public record DocumentSummaryDto(
    long Id,
    string Type,
    string Number,
    DateOnly Date,
    string? CounterpartyName,
    string CurrencyCode,
    decimal TotalAmount,
    decimal DiscountAmount,
    string Status,
    DateTime CreatedAt
);

public record CreateDocumentLineRequest(
    Guid ProductId,
    decimal Quantity,
    decimal Price,
    decimal DiscountPercent
);

public record CreateDocumentRequest(
    string Type,
    DateOnly Date,
    Guid? BranchId,
    Guid? CounterpartyId,
    Guid CurrencyId,
    decimal ExchangeRate,
    decimal DiscountPercent,
    string? Note,
    IReadOnlyList<CreateDocumentLineRequest> Lines
);

public record UpdateDocumentRequest(
    DateOnly Date,
    Guid? CounterpartyId,
    Guid CurrencyId,
    decimal ExchangeRate,
    decimal DiscountPercent,
    string? Note,
    IReadOnlyList<CreateDocumentLineRequest> Lines
);
