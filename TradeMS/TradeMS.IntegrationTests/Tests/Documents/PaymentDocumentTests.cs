using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Documents;

file record DocResp(long Id, string Type, string Status, decimal TotalAmount, decimal TotalAmountBase);

[Collection("Integration")]
public class PaymentDocumentTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public PaymentDocumentTests(TradeApiFactory factory) : base(factory) { }

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

    // 2.7 — PayOut с покупателем → баланс покупателя уменьшился
    // PayOut: Balance -= TotalAmountBase (покупатель заплатил нам)
    [Fact]
    public async Task ConfirmPayOut_WithCustomer_DecreasesCustomerBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(30);
        var supplierId = TestDataSeeder.GetSupplierId(0);
        var customerId = TestDataSeeder.GetCustomerId(0);

        // Expense: customer balance = +150000 (10 * 15000)
        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 10m, 15000m);

        // PayOut: customer pays 80000 (using product line as amount carrier)
        var payProductId = TestDataSeeder.GetProductId(31);
        var payResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "PayOut",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId = payProductId, quantity = 1m, price = 80_000m, discountPercent = 0m } }
        });
        var payDraft = await payResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{payDraft!.Id}/confirm", null);

        var customer = await Db.Counterparties.FindAsync(customerId);
        // 150000 - 80000 = 70000
        customer!.Balance.Should().Be(70_000m);
    }

    // 2.7 — PayIn с поставщиком → баланс поставщика увеличился (наш долг уменьшился)
    // PayIn: Balance += TotalAmountBase (мы платим поставщику)
    [Fact]
    public async Task ConfirmPayIn_WithSupplier_IncreasesSupplierBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(32);
        var supplierId = TestDataSeeder.GetSupplierId(1);

        // Income: supplier balance = -120000 (10 * 12000), we owe them
        await CreateAndConfirm("Income", supplierId, productId, 10m, 12000m);

        // PayIn: we pay supplier 50000
        var payProductId = TestDataSeeder.GetProductId(33);
        var payResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "PayIn",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId = payProductId, quantity = 1m, price = 50_000m, discountPercent = 0m } }
        });
        var payDraft = await payResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{payDraft!.Id}/confirm", null);

        var supplier = await Db.Counterparties.FindAsync(supplierId);
        // -120000 + 50000 = -70000 (still owe 70000)
        supplier!.Balance.Should().Be(-70_000m);
    }

    // 2.7 — частичная оплата → остаток долга корректен
    [Fact]
    public async Task PartialPayment_LeavesCorrectRemainingBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(34);
        var supplierId = TestDataSeeder.GetSupplierId(2);
        var customerId = TestDataSeeder.GetCustomerId(2);

        // Expense: customer owes 200000 (4 * 50000)
        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 4m, 50_000m);

        // First payment: 75000
        var payProductId = TestDataSeeder.GetProductId(35);
        var p1Resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "PayOut",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId = payProductId, quantity = 1m, price = 75_000m, discountPercent = 0m } }
        });
        var p1 = await p1Resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{p1!.Id}/confirm", null);

        // Second payment: 50000
        var p2Resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "PayOut",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId = payProductId, quantity = 1m, price = 50_000m, discountPercent = 0m } }
        });
        var p2 = await p2Resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{p2!.Id}/confirm", null);

        var customer = await Db.Counterparties.FindAsync(customerId);
        // 200000 - 75000 - 50000 = 75000 remaining
        customer!.Balance.Should().Be(75_000m);
    }

    // 2.7 — PayIn не меняет склад
    [Fact]
    public async Task ConfirmPayIn_DoesNotAffectStock()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(36);
        var supplierId = TestDataSeeder.GetSupplierId(3);

        // Income: bring stock
        await CreateAndConfirm("Income", supplierId, productId, 10m, 12000m);

        // PayIn
        var payProductId = TestDataSeeder.GetProductId(37);
        var payResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "PayIn",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId = payProductId, quantity = 1m, price = 30_000m, discountPercent = 0m } }
        });
        var payDraft = await payResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{payDraft!.Id}/confirm", null);

        // Stock for income product should still be 10 (payment doesn't touch stock)
        var stock = await Db.Stocks
            .Where(s => s.ProductId == productId && s.BranchId == TestDataSeeder.BranchMainId)
            .FirstOrDefaultAsync();
        stock!.Quantity.Should().Be(10m);
    }
}
