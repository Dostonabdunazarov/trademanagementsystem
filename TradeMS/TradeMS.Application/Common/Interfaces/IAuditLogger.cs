namespace TradeMS.Application.Common.Interfaces;

public interface IAuditLogger
{
    Task LogAsync(
        string action,
        bool success = true,
        string? entityType = null,
        string? entityId = null,
        string? details = null,
        string? errorMessage = null,
        Guid? overrideUserId = null,
        string? overrideEmail = null,
        string? overrideIp = null,
        CancellationToken cancellationToken = default);
}
