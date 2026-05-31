namespace TradeMS.Domain.Entities;

public class Branch
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<User> Users { get; set; } = [];
    public ICollection<Stock> Stocks { get; set; } = [];
    public ICollection<Document> Documents { get; set; } = [];
    public ICollection<Account> Accounts { get; set; } = [];
}
