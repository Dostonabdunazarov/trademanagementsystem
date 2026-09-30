using TradeMS.Domain.Enums;

namespace TradeMS.Domain.Entities;

public class Document
{
    public long Id { get; set; }
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public DocumentType Type { get; set; }
    public string Number { get; set; } = string.Empty;
    public DateOnly Date { get; set; }
    public Guid? CounterpartyId { get; set; }
    public Guid CurrencyId { get; set; }
    public decimal ExchangeRate { get; set; } = 1;
    public decimal TotalAmount { get; set; }
    public decimal TotalAmountBase { get; set; }
    public decimal DiscountPercent { get; set; }
    public decimal DiscountAmount { get; set; }
    public string? Note { get; set; }
    public decimal? Amount { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }
    public Guid? AccountId { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Draft;
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public Company Company { get; set; } = null!;
    public Branch Branch { get; set; } = null!;
    public Counterparty? Counterparty { get; set; }
    public Currency Currency { get; set; } = null!;
    public Account? Account { get; set; }
    public User Creator { get; set; } = null!;
    public ICollection<DocumentLine> Lines { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}
