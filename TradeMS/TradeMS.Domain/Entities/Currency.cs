namespace TradeMS.Domain.Entities;

public class Currency
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool IsBase { get; set; }

    public ICollection<ExchangeRate> ExchangeRatesFrom { get; set; } = [];
    public ICollection<ExchangeRate> ExchangeRatesTo { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<Account> Accounts { get; set; } = [];
}
