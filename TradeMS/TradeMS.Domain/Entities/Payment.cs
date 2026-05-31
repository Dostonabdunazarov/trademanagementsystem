using TradeMS.Domain.Enums;

namespace TradeMS.Domain.Entities;

public class Payment
{
    public long Id { get; set; }
    public long DocumentId { get; set; }
    public Guid CounterpartyId { get; set; }
    public decimal Amount { get; set; }
    public Guid CurrencyId { get; set; }
    public decimal ExchangeRate { get; set; } = 1;
    public decimal AmountBase { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public Guid? AccountId { get; set; }

    public Document Document { get; set; } = null!;
    public Counterparty Counterparty { get; set; } = null!;
    public Currency Currency { get; set; } = null!;
    public Account? Account { get; set; }
}
