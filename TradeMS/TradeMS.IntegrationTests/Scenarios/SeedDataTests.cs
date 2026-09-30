using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.IntegrationTests.Scenarios;

[Collection("Integration")]
public class SeedDataTests : IAsyncLifetime
{
    private readonly TradeApiFactory _factory;
    private AppDbContext Db => _factory.Services.CreateScope()
        .ServiceProvider.GetRequiredService<AppDbContext>();

    public SeedDataTests(TradeApiFactory factory)
    {
        _factory = factory;
    }

    public async Task InitializeAsync()
    {
        await _factory.ResetDatabaseAsync();
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await TestDataSeeder.SeedAsync(db);
    }

    public Task DisposeAsync() => Task.CompletedTask;

    [Fact]
    public async Task Seed_Creates_Company_And_Branches()
    {
        var db = Db;
        var company = await db.Companies.FindAsync(TestDataSeeder.CompanyId);
        company.Should().NotBeNull();
        company!.Name.Should().Be("ООО ТестКомпания");

        var branches = await db.Branches.Where(b => b.CompanyId == TestDataSeeder.CompanyId).ToListAsync();
        branches.Should().HaveCount(2);
        branches.Should().Contain(b => b.Id == TestDataSeeder.BranchMainId);
        branches.Should().Contain(b => b.Id == TestDataSeeder.BranchWarehouseId);
    }

    [Fact]
    public async Task Seed_Creates_Two_Currencies()
    {
        var currencies = await Db.Currencies.ToListAsync();
        currencies.Should().HaveCount(2);
        currencies.Should().Contain(c => c.Code == "UZS" && c.IsBase);
        currencies.Should().Contain(c => c.Code == "USD" && !c.IsBase);
    }

    [Fact]
    public async Task Seed_Creates_Four_Users()
    {
        var users = await Db.Users.Where(u => u.CompanyId == TestDataSeeder.CompanyId).ToListAsync();
        users.Should().HaveCount(4);
        users.Should().Contain(u => u.Email == TestDataSeeder.AdminNoBranchEmail);
        users.Should().Contain(u => u.Email == TestDataSeeder.AdminEmail);
        users.Should().Contain(u => u.Email == TestDataSeeder.ManagerEmail);
        users.Should().Contain(u => u.Email == TestDataSeeder.CashierEmail);
    }

    [Fact]
    public async Task Seed_Creates_20_ProductGroups()
    {
        var count = await Db.ProductGroups.CountAsync(g => g.CompanyId == TestDataSeeder.CompanyId);
        count.Should().Be(20);
    }

    [Fact]
    public async Task Seed_Creates_200_Products_10_Per_Group()
    {
        var total = await Db.Products.CountAsync(p => p.CompanyId == TestDataSeeder.CompanyId);
        total.Should().Be(200);

        var groups = await Db.ProductGroups
            .Where(g => g.CompanyId == TestDataSeeder.CompanyId)
            .Select(g => g.Id)
            .ToListAsync();

        foreach (var gId in groups)
        {
            var count = await Db.Products.CountAsync(p => p.GroupId == gId);
            count.Should().Be(10, $"группа {gId} должна иметь 10 товаров");
        }
    }

    [Fact]
    public async Task Seed_Creates_50_Counterparties_Split_25_25()
    {
        var all = await Db.Counterparties
            .Where(c => c.CompanyId == TestDataSeeder.CompanyId)
            .ToListAsync();

        all.Should().HaveCount(50);
        all.Count(c => c.Type == Domain.Enums.CounterpartyType.Supplier).Should().Be(25);
        all.Count(c => c.Type == Domain.Enums.CounterpartyType.Customer).Should().Be(25);
    }

    [Fact]
    public async Task Seed_Creates_ExchangeRate_USD_To_UZS()
    {
        var rate = await Db.ExchangeRates.FirstOrDefaultAsync(
            r => r.FromCurrencyId == TestDataSeeder.CurrencyUsdId
              && r.ToCurrencyId == TestDataSeeder.CurrencyUzsId);

        rate.Should().NotBeNull();
        rate!.Rate.Should().Be(12_700m);
    }

    [Fact]
    public async Task Seed_Is_Idempotent_Running_Twice_Does_Not_Duplicate()
    {
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Run seed second time
        await TestDataSeeder.SeedAsync(db);

        var products = await db.Products.CountAsync(p => p.CompanyId == TestDataSeeder.CompanyId);
        products.Should().Be(200, "повторный запуск не должен дублировать товары");

        var counterparties = await db.Counterparties.CountAsync(c => c.CompanyId == TestDataSeeder.CompanyId);
        counterparties.Should().Be(50, "повторный запуск не должен дублировать контрагентов");
    }
}
