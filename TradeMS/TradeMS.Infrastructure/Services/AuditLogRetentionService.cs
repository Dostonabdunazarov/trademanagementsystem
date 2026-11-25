using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.Infrastructure.Services;

public class AuditLogRetentionService(
    IServiceScopeFactory scopeFactory,
    IConfiguration config,
    ILogger<AuditLogRetentionService> logger) : BackgroundService
{
    private const int BatchSize = 5000;
    private static readonly TimeSpan StartDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan Interval = TimeSpan.FromHours(24);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var months = config.GetValue("AuditLog:RetentionMonths", 3);
        if (months <= 0)
        {
            logger.LogInformation("Audit log retention disabled (AuditLog:RetentionMonths = {Months})", months);
            return;
        }

        try
        {
            await Task.Delay(StartDelay, stoppingToken);
            using var timer = new PeriodicTimer(Interval);
            do
            {
                try
                {
                    var deleted = await PurgeAsync(DateTime.UtcNow.AddMonths(-months), stoppingToken);
                    if (deleted > 0)
                        logger.LogInformation("Audit log retention: deleted {Count} entries older than {Months} months", deleted, months);
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogError(ex, "Audit log retention failed");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
    }

    public async Task<int> PurgeAsync(DateTime cutoffUtc, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var total = 0;
        while (true)
        {
            var ids = await db.AuditLogs
                .Where(l => l.CreatedAt < cutoffUtc)
                .OrderBy(l => l.Id)
                .Select(l => l.Id)
                .Take(BatchSize)
                .ToListAsync(ct);
            if (ids.Count == 0) break;

            total += await db.AuditLogs.Where(l => ids.Contains(l.Id)).ExecuteDeleteAsync(ct);
            if (ids.Count < BatchSize) break;
        }
        return total;
    }
}
