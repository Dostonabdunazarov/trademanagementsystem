using TradeMS.Domain.Enums;

namespace TradeMS.Domain.Entities;

public class Counterparty
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public CounterpartyType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Address { get; set; }
    public decimal CreditLimit { get; set; }
    public decimal Balance { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<Document> Documents { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}
