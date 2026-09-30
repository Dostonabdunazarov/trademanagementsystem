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

    /// <summary>
    /// Выручка строки в базовой валюте с учётом скидки документа. Фиксируется при проведении,
    /// сумма по строкам документа равна Document.TotalAmountBase.
    /// </summary>
    public decimal TotalBase { get; set; }

    /// <summary>Себестоимость строки в базовой валюте по закупочной цене на момент проведения.</summary>
    public decimal CostBase { get; set; }

    public Document Document { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
