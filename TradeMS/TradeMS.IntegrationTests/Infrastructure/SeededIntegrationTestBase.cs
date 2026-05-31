using Microsoft.Extensions.DependencyInjection;
using TradeMS.Infrastructure.Persistence;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Infrastructure;

/// <summary>
/// Base for all integration tests that need the standard seed data (company, users,
/// currencies, 20 product groups, 200 products, 50 counterparties).
/// </summary>
public abstract class SeededIntegrationTestBase : IntegrationTestBase
{
    protected SeededIntegrationTestBase(TradeApiFactory factory) : base(factory) { }

    protected override async Task SeedAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await TestDataSeeder.SeedAsync(db);
    }
}
