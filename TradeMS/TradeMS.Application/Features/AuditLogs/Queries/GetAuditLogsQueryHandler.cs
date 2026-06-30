using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;

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

        if (request.DateFrom.HasValue)
            query = query.Where(l => l.CreatedAt >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
        {
            // DateTo is treated as an inclusive day boundary. CreatedAt is a full timestamp, so use
            // a strict "< next day" comparison to include entries created later on the DateTo day.
            var dateToExclusive = request.DateTo.Value.Date.AddDays(1);
            query = query.Where(l => l.CreatedAt < dateToExclusive);
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
