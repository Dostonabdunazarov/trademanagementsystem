namespace TradeMS.Domain.Entities;

public static class AuditActions
{
    public const string LoginSuccess    = "LOGIN_SUCCESS";
    public const string LoginFail       = "LOGIN_FAIL";
    public const string LoginInactive   = "LOGIN_INACTIVE";
    public const string LoginLocked     = "LOGIN_LOCKED";
    public const string TokenRefresh    = "TOKEN_REFRESH";

    public const string UserCreate      = "USER_CREATE";
    public const string UserUpdate      = "USER_UPDATE";

    public const string DocCreate       = "DOC_CREATE";
    public const string DocUpdate       = "DOC_UPDATE";
    public const string DocConfirm      = "DOC_CONFIRM";
    public const string DocDelete       = "DOC_DELETE";

    public const string ProductCreate   = "PRODUCT_CREATE";
    public const string ProductUpdate   = "PRODUCT_UPDATE";
    public const string ProductDelete   = "PRODUCT_DELETE";
    public const string ProductGroupCreate = "PRODUCT_GROUP_CREATE";

    public const string CounterpartyCreate = "COUNTERPARTY_CREATE";
    public const string CounterpartyUpdate = "COUNTERPARTY_UPDATE";
    public const string CounterpartyDelete = "COUNTERPARTY_DELETE";

    public const string AccountCreate   = "ACCOUNT_CREATE";
    public const string AccountDelete   = "ACCOUNT_DELETE";

    public const string CurrencyCreate  = "CURRENCY_CREATE";
    public const string ExchangeRateCreate = "EXCHANGE_RATE_CREATE";

    public const string BranchCreate    = "BRANCH_CREATE";
    public const string BranchDelete    = "BRANCH_DELETE";

    public const string ErrorServer     = "ERROR_SERVER";
    public const string ErrorForbidden  = "ERROR_FORBIDDEN";
}
