namespace TradeMS.Domain.Entities;

/// <summary>Последний выданный порядковый номер документа для (компания, тип, год).</summary>
public class DocumentCounter
{
    public Guid CompanyId { get; set; }
    public string Type { get; set; } = string.Empty;
    public int Year { get; set; }
    public int LastNumber { get; set; }
}
