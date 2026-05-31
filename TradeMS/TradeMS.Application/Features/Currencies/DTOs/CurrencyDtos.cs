namespace TradeMS.Application.Features.Currencies.DTOs;

public record CurrencyDto(
    Guid Id,
    string Code,
    string Name,
    bool IsBase
);

public record ExchangeRateDto(
    Guid Id,
    Guid FromCurrencyId,
    string FromCurrencyCode,
    Guid ToCurrencyId,
    string ToCurrencyCode,
    decimal Rate,
    DateOnly Date
);

public record CreateExchangeRateRequest(
    Guid FromCurrencyId,
    Guid ToCurrencyId,
    decimal Rate,
    DateOnly Date
);

public record CreateCurrencyRequest(
    string Code,
    string Name,
    bool IsBase
);
