namespace TradeMS.Domain.Entities;

public class Company
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? TaxCode { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; }

    public ICollection<Branch> Branches { get; set; } = [];
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Counterparty> Counterparties { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
    public ICollection<ProductGroup> ProductGroups { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
    public ICollection<Account> Accounts { get; set; } = [];
}
