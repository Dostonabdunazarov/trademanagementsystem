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
file record DocSummaryResp(long Id, string Type, string Status, decimal TotalAmount);
file record PagedDocResp(List<DocSummaryResp> Items, int TotalCount);

[Collection("Integration")]
public class IncomeDocumentTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public IncomeDocumentTests(TradeApiFactory factory) : base(factory) { }

    // 2.4 — создать черновик прихода
    [Fact]
    public async Task CreateIncomeDraft_ReturnsDocumentWithStatusDraft()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(1);
        var supplierId = TestDataSeeder.GetSupplierId(0);

        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            note = "Тестовый приход",
            lines = new[]
            {
                new { productId = productId, quantity = 10m, price = 12000m, discountPercent = 0m }
            }
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        body!.Type.Should().Be("Income");
        body.Status.Should().Be("Draft");
        body.TotalAmount.Should().Be(120_000m);  // 10 * 12000
        body.Lines.Should().HaveCount(1);
        body.Lines[0].Quantity.Should().Be(10m);
    }

    // 2.4 — подтвердить приход → склад увеличился
    [Fact]
    public async Task ConfirmIncome_IncreasesStock()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(1);
        var supplierId = TestDataSeeder.GetSupplierId(0);

        var createResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 15m, price = 12000m, discountPercent = 0m }
            }
        });

        var draft = await createResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);

        var confirmResp = await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);
        confirmResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var confirmed = await confirmResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        confirmed!.Status.Should().Be("Confirmed");

        var stock = await Db.Stocks.FirstOrDefaultAsync(
            s => s.ProductId == productId && s.BranchId == TestDataSeeder.BranchMainId);
        stock.Should().NotBeNull();
        stock!.Quantity.Should().Be(15m);
    }

    // 2.4 — подтвердить приход → баланс поставщика уменьшился (мы задолжали)
    [Fact]
    public async Task ConfirmIncome_DecreasesSupplierBalance()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(2);
        var supplierId = TestDataSeeder.GetSupplierId(0);

        var createResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 5m, price = 20000m, discountPercent = 0m }
            }
        });

        var draft = await createResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);

        var supplier = await Db.Counterparties.FindAsync(supplierId);
        // Income: Balance -= TotalAmountBase → balance becomes negative (we owe supplier)
        supplier!.Balance.Should().Be(-100_000m);  // 5 * 20000 = 100000
    }

    // 2.4 — двойное подтверждение → ошибка
    [Fact]
    public async Task ConfirmAlreadyConfirmed_Returns500WithError()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(3);
        var supplierId = TestDataSeeder.GetSupplierId(1);

        var createResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 1m, price = 5000m, discountPercent = 0m }
            }
        });

        var draft = await createResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);

        // Second confirm — should fail
        var secondConfirm = await Client.PostAsync($"/api/documents/{draft.Id}/confirm", null);
        secondConfirm.IsSuccessStatusCode.Should().BeFalse();
    }

    // 2.4 — GET /documents/{id} возвращает документ с линиями
    [Fact]
    public async Task GetDocumentById_ReturnsDocumentWithLines()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(4);
        var supplierId = TestDataSeeder.GetSupplierId(2);

        var createResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 3m, price = 10000m, discountPercent = 0m }
            }
        });

        var draft = await createResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        var getResp = await Client.GetAsync($"/api/documents/{draft!.Id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await getResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        body!.Id.Should().Be(draft.Id);
        body.Lines.Should().HaveCount(1);
        body.Lines[0].ProductId.Should().Be(productId);
        body.Lines[0].Quantity.Should().Be(3m);
    }

    // 2.4 — приход в USD с конвертацией
    [Fact]
    public async Task ConfirmIncome_InUsd_CalculatesTotalAmountBase()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(5);
        var supplierId = TestDataSeeder.GetSupplierId(3);
        const decimal exchangeRate = 12700m;
        const decimal priceUsd = 10m;
        const decimal qty = 2m;

        var createResp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUsdId,
            exchangeRate = exchangeRate,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = qty, price = priceUsd, discountPercent = 0m }
            }
        });

        var draft = await createResp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);

        // TotalAmount = 2 * 10 = 20 USD
        // TotalAmountBase = 20 * 12700 = 254000 UZS
        draft!.TotalAmount.Should().Be(20m);
        draft.TotalAmountBase.Should().Be(254_000m);
    }

    // 2.4 — список документов с фильтром по типу
    [Fact]
    public async Task GetDocuments_FilteredByIncomeType_ReturnsList()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(6);
        var supplierId = TestDataSeeder.GetSupplierId(4);

        await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            counterpartyId = supplierId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[]
            {
                new { productId = productId, quantity = 1m, price = 5000m, discountPercent = 0m }
            }
        });

        var resp = await Client.GetAsync("/api/documents?type=Income");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedDocResp>(JsonOpts);
        body!.TotalCount.Should().BeGreaterThan(0);
        body.Items.Should().AllSatisfy(d => d.Type.Should().Be("Income"));
    }

    // 2.4 — номер документа генерируется корректно
    [Fact]
    public async Task CreateIncome_DocumentNumberHasIncPrefix()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(7);
        var supplierId = TestDataSeeder.GetSupplierId(5);

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
                new { productId = productId, quantity = 1m, price = 5000m, discountPercent = 0m }
            }
        });

        var body = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        body!.Number.Should().StartWith("INC-");
    }
}
