using TradeMS.Domain.Enums;

namespace TradeMS.Domain.Entities;

public class Account
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    public AccountType Type { get; set; }
    public Guid CurrencyId { get; set; }
    public decimal Balance { get; set; }

    public Company Company { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Currency Currency { get; set; } = null!;
    public ICollection<Payment> Payments { get; set; } = [];
}
