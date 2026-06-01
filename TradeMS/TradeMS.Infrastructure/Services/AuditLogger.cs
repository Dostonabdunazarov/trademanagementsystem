using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.Infrastructure.Services;

public class AuditLogger(IDbContextFactory<AppDbContext> factory, ICurrentUserService currentUser) : IAuditLogger
{
    public async Task LogAsync(
        string action,
        bool success = true,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        string? errorMessage = null,
        Guid? overrideUserId = null,
        string? overrideEmail = null,
        string? overrideIp = null,
        Guid? overrideCompanyId = null,
        CancellationToken cancellationToken = default)
    {
        var log = new AuditLog
        {
            Action       = action,
            Success      = success,
            EntityType   = entityType,
            EntityId     = entityId,
            Details      = details,
            ErrorMessage = errorMessage,
            CompanyId    = overrideCompanyId ?? currentUser.CompanyId ?? Guid.Empty,
            UserId       = overrideUserId ?? currentUser.UserId,
            UserEmail    = overrideEmail  ?? currentUser.UserEmail,
            IpAddress    = overrideIp     ?? currentUser.IpAddress,
            UserAgent    = currentUser.UserAgent,
            CreatedAt    = DateTime.UtcNow,
        };

        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        db.AuditLogs.Add(log);
        await db.SaveChangesAsync(cancellationToken);
    }
}
