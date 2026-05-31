using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Documents;

file record DocResp(long Id, string Type, string Status, decimal TotalAmount, decimal TotalAmountBase,
    string Number, List<LineResp> Lines);
file record LineResp(long Id, Guid ProductId, decimal Quantity, decimal Price, decimal Total);

[Collection("Integration")]
public class ExpenseDocumentTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ExpenseDocumentTests(TradeApiFactory factory) : base(factory) { }

    private async Task CreateAndConfirmIncome(Guid productId, Guid supplierId, decimal qty)
    {
        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = qty, price = 12000m, discountPercent = 0m }
            }
        });
        var draft = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);
    }

    // 2.5 — создать расход после прихода (есть остаток)
    [Fact]
    public async Task CreateExpenseDraft_ReturnsDocumentWithStatusDraft()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(10);
        var supplierId = TestDataSeeder.GetSupplierId(0);
        var customerId = TestDataSeeder.GetCustomerId(0);

        await CreateAndConfirmIncome(productId, supplierId, 20m);

        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 5m, price = 15000m, discountPercent = 0m }
            }
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        body!.Type.Should().Be("Expense");
        body.Status.Should().Be("Draft");
        body.TotalAmount.Should().Be(75_000m);  // 5 * 15000
        body.Number.Should().StartWith("EXP-");
    }

    // 2.5 — подтвердить расход → склад уменьшился
    [Fact]
    public async Task ConfirmExpense_DecreasesStock()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(11);
        var supplierId = TestDataSeeder.GetSupplierId(1);
        var customerId = TestDataSeeder.GetCustomerId(1);

        await CreateAndConfirmIncome(productId, supplierId, 20m);

        var expResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 7m, price = 15000m, discountPercent = 0m }
            }
        });

        var expDraft = await expResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        var confirmResp = await Client.PostAsync($"/api/documents/{expDraft!.Id}/confirm", null);
        confirmResp.StatusCode.Should().Be(HttpStatusCode.OK);

        // Stock: started 20, sold 7 → remaining 13
        var stock = await Db.Stocks.FirstOrDefaultAsync(
            s => s.ProductId == productId && s.BranchId == TestDataSeeder.BranchMainId);
        stock!.Quantity.Should().Be(13m);
    }

    // 2.5 — расход → баланс покупателя увеличился (задолжал нам)
    [Fact]
    public async Task ConfirmExpense_IncreasesCustomerBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(12);
        var supplierId = TestDataSeeder.GetSupplierId(2);
        var customerId = TestDataSeeder.GetCustomerId(2);

        await CreateAndConfirmIncome(productId, supplierId, 20m);

        var expResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 3m, price = 15000m, discountPercent = 0m }
            }
        });

        var expDraft = await expResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{expDraft!.Id}/confirm", null);

        var customer = await Db.Counterparties.FindAsync(customerId);
        // Expense: Balance += TotalAmountBase = 3 * 15000 = 45000
        customer!.Balance.Should().Be(45_000m);
    }

    // 2.5 — расход больше остатка → ошибка
    [Fact]
    public async Task ConfirmExpense_WithInsufficientStock_ReturnsError()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(13);
        var supplierId = TestDataSeeder.GetSupplierId(3);
        var customerId = TestDataSeeder.GetCustomerId(3);

        await CreateAndConfirmIncome(productId, supplierId, 5m);

        // Try to sell 10 when only 5 in stock
        var expResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 10m, price = 15000m, discountPercent = 0m }
            }
        });

        var expDraft = await expResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        var confirmResp = await Client.PostAsync($"/api/documents/{expDraft!.Id}/confirm", null);
        confirmResp.IsSuccessStatusCode.Should().BeFalse();

        // Stock should remain unchanged
        var stock = await Db.Stocks.FirstOrDefaultAsync(
            s => s.ProductId == productId && s.BranchId == TestDataSeeder.BranchMainId);
        stock!.Quantity.Should().Be(5m);
    }

    // 2.5 — нулевой остаток на складе → расход невозможен
    [Fact]
    public async Task ConfirmExpense_WithZeroStock_ReturnsError()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(14);  // no income created, no stock
        var customerId = TestDataSeeder.GetCustomerId(4);

        var expResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 1m, price = 15000m, discountPercent = 0m }
            }
        });

        var expDraft = await expResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        var confirmResp = await Client.PostAsync($"/api/documents/{expDraft!.Id}/confirm", null);
        confirmResp.IsSuccessStatusCode.Should().BeFalse();
    }

    // 2.5 — удаление черновика расхода → 204
    [Fact]
    public async Task DeleteDraftExpense_ReturnsNoContent()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(15);
        var customerId = TestDataSeeder.GetCustomerId(5);

        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 1m, price = 5000m, discountPercent = 0m }
            }
        });

        var draft = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        var deleteResp = await Client.DeleteAsync($"/api/documents/{draft!.Id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // 2.5 — удаление подтверждённого документа → ошибка
    [Fact]
    public async Task DeleteConfirmedDocument_ReturnsError()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(16);
        var supplierId = TestDataSeeder.GetSupplierId(4);
        var customerId = TestDataSeeder.GetCustomerId(6);

        await CreateAndConfirmIncome(productId, supplierId, 10m);

        var expResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Expense",
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 1m, price = 5000m, discountPercent = 0m }
            }
        });

        var expDraft = await expResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{expDraft!.Id}/confirm", null);

        var deleteResp = await Client.DeleteAsync($"/api/documents/{expDraft.Id}");
        deleteResp.IsSuccessStatusCode.Should().BeFalse();
    }
}
