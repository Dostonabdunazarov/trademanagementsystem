namespace TradeMS.Domain.Entities;

public class DocumentLine
{
    public long Id { get; set; }
    public long DocumentId { get; set; }
    public Guid ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal Price { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountPrice { get; set; }
    public decimal Total { get; set; }

    public Document Document { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
