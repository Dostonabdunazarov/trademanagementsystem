using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents;

namespace TradeMS.Application.Features.Reports;

/// <summary>
/// Курсы валют к базовой на дату — для оценки остатков, чьи цены хранятся в валюте товара.
/// Проводки такой пересчёт не используют: у них курс фиксируется при проведении.
/// </summary>
internal sealed class ReportRates
{
    private readonly Dictionary<Guid, decimal> _rates;

    private ReportRates(Dictionary<Guid, decimal> rates) => _rates = rates;

    /// <summary>
    /// Если курс не заведён, сумма берётся без пересчёта (1:1) — отчёт должен открываться,
    /// а недостающий курс видно в настройках валют.
    /// </summary>
    public decimal ToBase(Guid currencyId) => _rates.GetValueOrDefault(currencyId, 1m);

    public static async Task<ReportRates> LoadAsync(
        IAppDbContext db, IEnumerable<Guid> currencyIds, DateOnly date, CancellationToken ct)
    {
        var rates = new Dictionary<Guid, decimal>();
        var baseCurrencyId = await db.Currencies
            .Where(c => c.IsBase).Select(c => (Guid?)c.Id).FirstOrDefaultAsync(ct);
        if (baseCurrencyId is null)
            return new ReportRates(rates);

        foreach (var id in currencyIds.Distinct())
        {
            var rate = await DocumentRules.FindRateToBaseAsync(db, id, baseCurrencyId.Value, date, ct);
            if (rate.HasValue)
                rates[id] = rate.Value;
        }
        return new ReportRates(rates);
    }
}
