using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TradeMS.Infrastructure;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.IntegrationTests.Seeders;

/// <summary>
/// Runs seed data against the dev PostgreSQL database.
/// Usage: dotnet test --filter "FullyQualifiedName~SeedRunner" -- ConnectionStrings:DefaultConnection="..."
///
/// Or set env var: TRADEMS_SEED_CONN before running.
/// </summary>
public class SeedRunner
{
    [Fact(Skip = "Manual: run with TRADEMS_SEED_CONN env var to seed dev database")]
    public async Task SeedDevDatabase()
    {
        var connStr = Environment.GetEnvironmentVariable("TRADEMS_SEED_CONN")
            ?? throw new InvalidOperationException(
                "Set TRADEMS_SEED_CONN env var to the dev PostgreSQL connection string");

        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(opts => opts.UseNpgsql(connStr));

        await using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await db.Database.MigrateAsync();
        await TestDataSeeder.SeedAsync(db);

        var companies = await db.Companies.CountAsync();
        var products = await db.Products.CountAsync();
        var counterparties = await db.Counterparties.CountAsync();

        Assert.True(companies >= 1, $"Expected at least 1 company, got {companies}");
        Assert.True(products >= 200, $"Expected 200 products, got {products}");
        Assert.True(counterparties >= 50, $"Expected 50 counterparties, got {counterparties}");
    }
}
