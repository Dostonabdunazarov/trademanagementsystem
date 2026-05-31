namespace TradeMS.Domain.Entities;

public class ExchangeRate
{
    public Guid Id { get; set; }
    public Guid FromCurrencyId { get; set; }
    public Guid ToCurrencyId { get; set; }
    public decimal Rate { get; set; }
    public DateOnly Date { get; set; }

    public Currency FromCurrency { get; set; } = null!;
    public Currency ToCurrency { get; set; } = null!;
}
