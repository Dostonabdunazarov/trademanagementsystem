namespace TradeMS.Domain.Entities;

public class Stock
{
    public Guid Id { get; set; }
    public Guid ProductId { get; set; }
    public Guid BranchId { get; set; }
    public decimal Quantity { get; set; }

    public Product Product { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
}
