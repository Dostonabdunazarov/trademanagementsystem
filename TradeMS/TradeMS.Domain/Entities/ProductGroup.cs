namespace TradeMS.Domain.Entities;

public class ProductGroup
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }

    public Company Company { get; set; } = null!;
    public ProductGroup? Parent { get; set; }
    public ICollection<ProductGroup> Children { get; set; } = [];
    public ICollection<Product> Products { get; set; } = [];
}
