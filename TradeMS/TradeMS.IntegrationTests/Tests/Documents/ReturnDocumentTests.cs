using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Documents;

file record DocResp(long Id, string Type, string Status, decimal TotalAmount, decimal TotalAmountBase);

[Collection("Integration")]
public class ReturnDocumentTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ReturnDocumentTests(TradeApiFactory factory) : base(factory) { }

    private async Task<long> CreateAndConfirm(string type, Guid counterpartyId, Guid productId,
        decimal qty, decimal price)
    {
        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = type,
            date = "2026-05-31",
            counterpartyId = counterpartyId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId, quantity = qty, price = price, discountPercent = 0m } }
        });
        var draft = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);
        return draft.Id;
    }

    // 2.6 — ReturnFromCustomer → склад увеличился
    [Fact]
    public async Task ConfirmReturnFromCustomer_IncreasesStock()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(20);
        var supplierId = TestDataSeeder.GetSupplierId(0);
        var customerId = TestDataSeeder.GetCustomerId(0);

        // First: bring in stock, then sell
        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 10m, 15000m);
        // Stock should be 10 now

        // ReturnFromCustomer: customer returns 3 units
        await CreateAndConfirm("ReturnFromCustomer", customerId, productId, 3m, 15000m);

        var stock = await Db.Stocks.FirstOrDefaultAsync(
            s => s.ProductId == productId && s.BranchId == TestDataSeeder.BranchMainId);
        stock!.Quantity.Should().Be(13m);  // 20 - 10 + 3
    }

    // 2.6 — ReturnFromCustomer → баланс покупателя уменьшился
    [Fact]
    public async Task ConfirmReturnFromCustomer_DecreasesCustomerBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(21);
        var supplierId = TestDataSeeder.GetSupplierId(1);
        var customerId = TestDataSeeder.GetCustomerId(1);

        // Sell to customer: balance becomes +90000 (6 * 15000)
        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 6m, 15000m);

        // Customer returns 2: balance -= 2 * 15000 = 30000
        await CreateAndConfirm("ReturnFromCustomer", customerId, productId, 2m, 15000m);

        var customer = await Db.Counterparties.FindAsync(customerId);
        // Expense: +90000; ReturnFromCustomer: -30000 → net 60000
        customer!.Balance.Should().Be(60_000m);
    }

    // 2.6 — ReturnToSupplier → склад уменьшился
    [Fact]
    public async Task ConfirmReturnToSupplier_DecreasesStock()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(22);
        var supplierId = TestDataSeeder.GetSupplierId(2);

        // First bring in stock
        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);
        // Stock = 20

        // Return 5 to supplier
        await CreateAndConfirm("ReturnToSupplier", supplierId, productId, 5m, 12000m);

        var stock = await Db.Stocks.FirstOrDefaultAsync(
            s => s.ProductId == productId && s.BranchId == TestDataSeeder.BranchMainId);
        stock!.Quantity.Should().Be(15m);  // 20 - 5
    }

    // 2.6 — ReturnToSupplier → баланс поставщика увеличился (наш долг уменьшился)
    [Fact]
    public async Task ConfirmReturnToSupplier_IncreasesSupplierBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(23);
        var supplierId = TestDataSeeder.GetSupplierId(3);

        // Income: balance -= 120000 (10 * 12000), we owe supplier 120000
        await CreateAndConfirm("Income", supplierId, productId, 10m, 12000m);

        // ReturnToSupplier: balance += 60000 (5 * 12000), we return goods worth 60000
        await CreateAndConfirm("ReturnToSupplier", supplierId, productId, 5m, 12000m);

        var supplier = await Db.Counterparties.FindAsync(supplierId);
        // -120000 + 60000 = -60000 (still owe 60000)
        supplier!.Balance.Should().Be(-60_000m);
    }

    // 2.6 — ReturnToSupplier без остатка → ошибка
    [Fact]
    public async Task ConfirmReturnToSupplier_WithInsufficientStock_ReturnsError()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(24);
        var supplierId = TestDataSeeder.GetSupplierId(4);

        // No income = no stock. Return should fail.
        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "ReturnToSupplier",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId, quantity = 1m, price = 12000m, discountPercent = 0m } }
        });

        var draft = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        var confirmResp = await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);
        confirmResp.IsSuccessStatusCode.Should().BeFalse();
    }
}
