namespace TradeMS.Application.Common.Exceptions;

/// <summary>
/// Нарушение бизнес-правила с машиночитаемым кодом. Клиент по <see cref="Code"/> и
/// <see cref="Args"/> строит понятный текст на языке интерфейса; Message — английский
/// fallback для логов и клиентов без перевода.
/// Наследует InvalidOperationException, поэтому по-прежнему отдаётся как 409 Conflict.
/// </summary>
public class BusinessException(
    string code,
    string message,
    IReadOnlyDictionary<string, object?>? args = null) : InvalidOperationException(message)
{
    public string Code { get; } = code;
    public IReadOnlyDictionary<string, object?> Args { get; } = args ?? new Dictionary<string, object?>();
}

/// <summary>Коды ошибок документов. Значения совпадают с ключами errors.* в локалях UI.</summary>
public static class DocumentErrorCodes
{
    public const string NotDraft = "documentNotDraft";
    public const string NotConfirmed = "documentNotConfirmed";
    public const string NoBaseCurrency = "noBaseCurrency";
    public const string ExchangeRateNotFound = "exchangeRateNotFound";
    public const string InsufficientStock = "insufficientStock";
    public const string CancelStockConsumed = "cancelStockConsumed";
    public const string AccountCurrencyMismatch = "accountCurrencyMismatch";

    // Валидация (FluentValidation ErrorCode)
    public const string LinesRequired = "linesRequired";
    public const string CounterpartyRequired = "counterpartyRequired";
    public const string AmountRequired = "amountRequired";
    public const string AmountPositive = "amountPositive";
    public const string InvalidPaymentMethod = "invalidPaymentMethod";
    public const string CurrencyRequired = "currencyRequired";
    public const string BranchRequired = "branchRequired";
    public const string ExchangeRatePositive = "exchangeRatePositive";
    public const string DiscountRange = "discountRange";
    public const string LineProductRequired = "lineProductRequired";
    public const string LineQuantityPositive = "lineQuantityPositive";
    public const string LinePriceNonNegative = "linePriceNonNegative";
}
