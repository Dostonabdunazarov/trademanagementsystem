namespace TradeMS.Application.Common.Time;

/// <summary>
/// «Сегодня» в часовом поясе пользователей. Даты документов (DateOnly) — местные даты, поэтому
/// DateTime.UtcNow для них не годится: с 00:00 до 05:00 по Ташкенту он даёт вчерашний день.
/// Узбекистан живёт в UTC+5 без перехода на летнее время, так что достаточно фиксированного смещения.
/// </summary>
public static class BusinessClock
{
    public static readonly TimeSpan UtcOffset = TimeSpan.FromHours(5);

    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow + UtcOffset);

    /// <summary>UTC-момент начала местных суток <paramref name="date"/> (для фильтров по timestamptz).</summary>
    public static DateTime StartOfDayUtc(DateOnly date) =>
        DateTime.SpecifyKind(date.ToDateTime(TimeOnly.MinValue) - UtcOffset, DateTimeKind.Utc);
}
