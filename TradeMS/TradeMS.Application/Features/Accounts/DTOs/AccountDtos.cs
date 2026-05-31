namespace TradeMS.Application.Features.Accounts.DTOs;

public record AccountDto(
    Guid Id,
    Guid CompanyId,
    Guid BranchId,
    string Name,
    string Type,
    Guid CurrencyId,
    string CurrencyCode,
    decimal Balance
);

public record CreateAccountRequest(
    string Name,
    string Type,
    Guid CurrencyId
);
