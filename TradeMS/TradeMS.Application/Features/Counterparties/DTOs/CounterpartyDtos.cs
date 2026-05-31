using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Counterparties.DTOs;

public record CounterpartyDto(
    Guid Id,
    Guid CompanyId,
    string Type,
    string Name,
    string? Phone,
    string? Address,
    decimal CreditLimit,
    decimal Balance,
    DateTime CreatedAt
);

public record CreateCounterpartyRequest(
    CounterpartyType Type,
    string Name,
    string? Phone,
    string? Address,
    decimal CreditLimit
);

public record UpdateCounterpartyRequest(
    CounterpartyType Type,
    string Name,
    string? Phone,
    string? Address,
    decimal CreditLimit
);
