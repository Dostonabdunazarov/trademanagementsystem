using System.Data.Common;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents;

/// <summary>Общие правила документов: деньги, строки, проверка ссылок, курс, нумерация.</summary>
internal static class DocumentRules
{
    /// <summary>Округление денег до 2 знаков (scale колонок numeric(18,2)).</summary>
    public static decimal Money(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);

    public static bool IsPayment(DocumentType type) => type is DocumentType.PayIn or DocumentType.PayOut;

    public static string Prefix(DocumentType type) => type switch
    {
        DocumentType.Expense            => "EXP",
        DocumentType.Income             => "INC",
        DocumentType.ReturnFromCustomer => "RFC",
        DocumentType.ReturnToSupplier   => "RTS",
        DocumentType.PayOut             => "POT",
        DocumentType.PayIn              => "PIN",
        _ => "DOC"
    };

    public static async Task<string> NextNumberAsync(
        IAppDbContext db, Guid companyId, DocumentType type, int year, CancellationToken ct)
    {
        var seq = await db.NextDocumentNumberAsync(companyId, type, year, ct);
        return $"{Prefix(type)}-{year}-{seq:D5}";
    }

    /// <summary>
    /// Строки документа. Итог строки округляется один раз от точного произведения —
    /// округление цены со скидкой до умножения на количество теряло копейки на больших партиях.
    /// DiscountPrice — справочная цена за единицу.
    /// </summary>
    public static List<DocumentLine> BuildLines(IReadOnlyList<CreateDocumentLineRequest> requests) =>
        requests.Select(r =>
        {
            var factor = 1 - r.DiscountPercent / 100m;
            return new DocumentLine
            {
                ProductId       = r.ProductId,
                Quantity        = r.Quantity,
                Price           = r.Price,
                DiscountPercent = r.DiscountPercent,
                DiscountPrice   = Money(r.Price * factor),
                Total           = Money(r.Quantity * r.Price * factor),
            };
        }).ToList();

    /// <summary>Итоги документа по строкам и скидке документа.</summary>
    public static (decimal DiscountAmount, decimal TotalAmount) Totals(
        IEnumerable<DocumentLine> lines, decimal discountPercent)
    {
        var subtotal = lines.Sum(l => l.Total);
        var discountAmount = Money(subtotal * (discountPercent / 100m));
        return (discountAmount, subtotal - discountAmount);
    }

    /// <summary>
    /// Все id из тела запроса должны принадлежать компании (и филиалу документа для кассы).
    /// Без этой проверки можно провести документ по чужой кассе/контрагенту/товару (IDOR).
    /// </summary>
    public static async Task EnsureReferencesAsync(
        IAppDbContext db,
        Guid companyId,
        Guid branchId,
        DocumentType type,
        Guid? counterpartyId,
        Guid currencyId,
        Guid? accountId,
        IReadOnlyCollection<Guid> productIds,
        IReadOnlyList<decimal>? quantities,
        CancellationToken ct)
    {
        if (!await db.Branches.AnyAsync(b => b.Id == branchId && b.CompanyId == companyId, ct))
            throw new BusinessException(DocumentErrorCodes.InvalidBranch, "Branch not found");

        if (!await db.Currencies.AnyAsync(c => c.Id == currencyId, ct))
            throw new BusinessException(DocumentErrorCodes.InvalidCurrency, "Currency not found");

        if (counterpartyId.HasValue &&
            !await db.Counterparties.AnyAsync(c =>
                c.Id == counterpartyId.Value && c.CompanyId == companyId && c.DeletedAt == null, ct))
            throw new BusinessException(DocumentErrorCodes.InvalidCounterparty, "Counterparty not found");

        if (IsPayment(type))
        {
            if (!accountId.HasValue)
                throw new BusinessException(DocumentErrorCodes.AccountRequired, "Account is required for payment documents");

            await EnsureAccountAsync(db, companyId, branchId, accountId.Value, ct);
            return;
        }

        var ids = productIds.Distinct().ToList();
        var products = await db.Products
            .Where(p => ids.Contains(p.Id) && p.CompanyId == companyId && p.IsActive)
            .Select(p => new { p.Id, p.Name, p.Unit })
            .ToListAsync(ct);

        var missing = ids.FirstOrDefault(id => products.All(p => p.Id != id));
        if (missing != Guid.Empty)
            throw new BusinessException(DocumentErrorCodes.InvalidProduct, "Product not found or inactive",
                new Dictionary<string, object?> { ["productId"] = missing });

        if (quantities is null) return;

        // Штучный товар не продаётся дробями.
        var byId = products.ToDictionary(p => p.Id);
        var lineIds = productIds.ToList();
        var errors = new List<FluentValidation.Results.ValidationFailure>();
        for (var i = 0; i < lineIds.Count && i < quantities.Count; i++)
        {
            if (byId[lineIds[i]].Unit == ProductUnit.Pcs && quantities[i] != decimal.Truncate(quantities[i]))
                errors.Add(new FluentValidation.Results.ValidationFailure($"Lines[{i}].Quantity",
                    $"Quantity of '{byId[lineIds[i]].Name}' must be a whole number")
                    { ErrorCode = DocumentErrorCodes.LineQuantityInteger });
        }
        if (errors.Count > 0)
            throw new FluentValidation.ValidationException(errors);
    }

    public static async Task<Account> EnsureAccountAsync(
        IAppDbContext db, Guid companyId, Guid branchId, Guid accountId, CancellationToken ct)
    {
        var account = await db.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.CompanyId == companyId, ct)
            ?? throw new BusinessException(DocumentErrorCodes.InvalidAccount, "Account not found");

        if (account.BranchId != branchId)
            throw new BusinessException(DocumentErrorCodes.AccountBranchMismatch,
                "Payment account belongs to another branch",
                new Dictionary<string, object?> { ["account"] = account.Name });

        return account;
    }

    /// <summary>
    /// Курс валюты к базовой на дату (последний на эту дату или раньше). Если заведён только
    /// обратный курс (база → валюта), используется 1/курс. Нет курса — null.
    /// </summary>
    public static async Task<decimal?> FindRateToBaseAsync(
        IAppDbContext db, Guid currencyId, Guid baseCurrencyId, DateOnly date, CancellationToken ct)
    {
        if (currencyId == baseCurrencyId)
            return 1m;

        var direct = await db.ExchangeRates
            .Where(r => r.FromCurrencyId == currencyId && r.ToCurrencyId == baseCurrencyId && r.Date <= date)
            .OrderByDescending(r => r.Date)
            .Select(r => new { r.Rate, r.Date })
            .FirstOrDefaultAsync(ct);

        var inverse = await db.ExchangeRates
            .Where(r => r.FromCurrencyId == baseCurrencyId && r.ToCurrencyId == currencyId && r.Date <= date && r.Rate > 0)
            .OrderByDescending(r => r.Date)
            .Select(r => new { r.Rate, r.Date })
            .FirstOrDefaultAsync(ct);

        // Берём более свежий из двух; при равенстве дат — прямой.
        if (direct is not null && (inverse is null || direct.Date >= inverse.Date))
            return direct.Rate;
        if (inverse is not null)
            return Math.Round(1m / inverse.Rate, 6, MidpointRounding.AwayFromZero);
        return null;
    }

    /// <summary>
    /// Распределяет TotalAmountBase документа по строкам (скидка документа + курс) так, чтобы
    /// сумма строк совпадала с документом копейка в копейку: остаток округления — в самую крупную строку.
    /// </summary>
    public static void DistributeBaseTotals(Document doc)
    {
        var lines = doc.Lines.ToList();
        if (lines.Count == 0) return;

        var factor = (1 - doc.DiscountPercent / 100m) * doc.ExchangeRate;
        foreach (var l in lines)
            l.TotalBase = Money(l.Total * factor);

        var diff = doc.TotalAmountBase - lines.Sum(l => l.TotalBase);
        if (diff != 0)
            lines.MaxBy(l => l.TotalBase)!.TotalBase += diff;
    }

    /// <summary>Конфликт уникального индекса (например, две параллельные вставки строки склада).</summary>
    public static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is DbException { SqlState: "23505" };

    public static async Task<DocumentDto> LoadDtoAsync(IAppDbContext db, long id, Guid companyId, CancellationToken ct)
    {
        var doc = await db.Documents
            .AsNoTracking()
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Account)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == id && d.CompanyId == companyId, ct);
        return MapToDto(doc);
    }

    public static DocumentDto MapToDto(Document doc) => new(
        doc.Id,
        doc.CompanyId,
        doc.BranchId,
        doc.Type.ToString(),
        doc.Number,
        doc.Date,
        doc.CounterpartyId,
        doc.Counterparty?.Name,
        doc.CurrencyId,
        doc.Currency.Code,
        doc.ExchangeRate,
        doc.TotalAmount,
        doc.TotalAmountBase,
        doc.DiscountPercent,
        doc.DiscountAmount,
        doc.Note,
        doc.Amount,
        doc.PaymentMethod?.ToString(),
        doc.AccountId,
        doc.Account?.Name,
        doc.Status.ToString(),
        doc.CreatedBy,
        doc.CreatedAt,
        doc.ConfirmedAt,
        doc.Lines.OrderBy(l => l.Id).Select(l => new DocumentLineDto(
            l.Id,
            l.ProductId,
            l.Product.Name,
            l.Quantity,
            l.Product.Unit.ToString(),
            l.Price,
            l.DiscountPercent,
            l.DiscountPrice,
            l.Total
        )).ToList()
    );
}
