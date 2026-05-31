using TradeMS.Domain.Enums;

namespace TradeMS.Domain.Entities;

public class Product
{
    public Guid Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid? GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public ProductUnit Unit { get; set; }
    public decimal PriceSell { get; set; }
    public decimal PriceBuy { get; set; }
    public Guid CurrencyId { get; set; }
    public bool IsActive { get; set; } = true;

    public Company Company { get; set; } = null!;
    public ProductGroup? Group { get; set; }
    public Currency Currency { get; set; } = null!;
    public ICollection<Stock> Stocks { get; set; } = [];
    public ICollection<DocumentLine> DocumentLines { get; set; } = [];
}
