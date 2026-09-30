namespace TradeMS.Application.Common.Exceptions;

/// <summary>
/// Нарушение бизнес-правила с машиночитаемым кодом. Клиент по <see cref="Code"/> и
/// <see cref="Args"/> строит понятный текст на языке интерфейса; Message — английский
/// fallback для логов и клиентов без перевода.
/// Отдаётся как 409 Conflict (см. GlobalExceptionHandler). Прочие InvalidOperationException
/// считаются внутренними ошибками и отдаются как 500 без текста.
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
    public const string LineQuantityInteger = "lineQuantityInteger";

    // Ссылки документа (id из тела запроса) не принадлежат компании/филиалу или недоступны
    public const string InvalidCounterparty = "invalidCounterparty";
    public const string InvalidProduct = "invalidProduct";
    public const string InvalidAccount = "invalidAccount";
    public const string InvalidBranch = "invalidBranch";
    public const string InvalidCurrency = "invalidCurrency";
    public const string AccountRequired = "accountRequired";
    public const string AccountBranchMismatch = "accountBranchMismatch";
}

/// <summary>Коды ошибок вне документов. Значения совпадают с ключами errors.codes.* в локалях UI.</summary>
public static class ErrorCodes
{
    public const string InvalidCredentials = "invalidCredentials";
    public const string SessionExpired = "sessionExpired";
    public const string BranchNotAssigned = "branchNotAssigned";
    public const string Forbidden = "forbidden";
    public const string ConcurrencyConflict = "concurrencyConflict";

    public const string AccountHasPayments = "accountHasPayments";
    public const string AccountInUse = "accountInUse";
    public const string BranchHasDocuments = "branchHasDocuments";
    public const string BranchHasAccounts = "branchHasAccounts";
    public const string BranchHasUsers = "branchHasUsers";
    public const string BranchHasStock = "branchHasStock";
    public const string ProductInUse = "productInUse";
    public const string ProductHasStock = "productHasStock";
    public const string CounterpartyHasBalance = "counterpartyHasBalance";
    public const string CurrencyExists = "currencyExists";
    public const string BaseCurrencyLocked = "baseCurrencyLocked";
    public const string EmailInUse = "emailInUse";
    public const string CannotModifySelf = "cannotModifySelf";
    public const string LastAdmin = "lastAdmin";
    public const string BranchRequiredForRole = "branchRequiredForRole";
}

/// <summary>Нет прав на ресурс (403). Code — ключ errors.codes.* в UI.</summary>
public class ForbiddenAccessException(string message, string code = ErrorCodes.Forbidden)
    : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>Не удалось аутентифицироваться (401). Code — ключ errors.codes.* в UI.</summary>
public class AuthenticationFailedException(string message, string code = ErrorCodes.InvalidCredentials)
    : UnauthorizedAccessException(message)
{
    public string Code { get; } = code;
}
