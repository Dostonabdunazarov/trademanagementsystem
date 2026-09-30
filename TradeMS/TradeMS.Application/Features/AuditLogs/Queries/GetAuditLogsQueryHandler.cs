using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Time;

namespace TradeMS.Application.Features.AuditLogs.Queries;

public class GetAuditLogsQueryHandler(IAppDbContext db)
    : IRequestHandler<GetAuditLogsQuery, GetAuditLogsResult>
{
    public async Task<GetAuditLogsResult> Handle(
        GetAuditLogsQuery request, CancellationToken cancellationToken)
    {
        var query = db.AuditLogs
            .Where(l => l.CompanyId == request.CompanyId);

        if (request.UserId.HasValue)
            query = query.Where(l => l.UserId == request.UserId);

        if (!string.IsNullOrEmpty(request.Action))
            query = query.Where(l => l.Action == request.Action);

        // Фильтр приходит местными датами (UTC+5), CreatedAt хранится в UTC: границы суток
        // переводим в UTC, иначе день «съезжал» на 5 часов.
        if (request.DateFrom.HasValue)
        {
            var fromUtc = BusinessClock.StartOfDayUtc(DateOnly.FromDateTime(request.DateFrom.Value));
            query = query.Where(l => l.CreatedAt >= fromUtc);
        }

        if (request.DateTo.HasValue)
        {
            // DateTo — включительно: берём всё до начала следующих местных суток.
            var toExclusiveUtc = BusinessClock.StartOfDayUtc(DateOnly.FromDateTime(request.DateTo.Value).AddDays(1));
            query = query.Where(l => l.CreatedAt < toExclusiveUtc);
        }

        if (request.Success.HasValue)
            query = query.Where(l => l.Success == request.Success.Value);

        var total = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(l => new AuditLogDto(
                l.Id,
                l.UserId,
                l.UserEmail,
                l.Action,
                l.EntityType,
                l.EntityId,
                l.Details,
                l.Success,
                l.ErrorMessage,
                l.IpAddress,
                l.UserAgent,
                l.CreatedAt))
            .ToListAsync(cancellationToken);

        return new GetAuditLogsResult(items, total);
    }
}
