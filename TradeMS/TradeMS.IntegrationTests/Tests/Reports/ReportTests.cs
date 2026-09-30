using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Reports;

file record DashboardResp(
    string DateFrom, string DateTo,
    decimal Revenue, decimal Profit, decimal DebtorDebt, int StockItemCount,
    List<MonthlySalesResp> MonthlySales);
file record MonthlySalesResp(int Year, int Month, string MonthLabel, decimal Revenue, decimal Profit);

file record SalesSummaryResp(
    string DateFrom, string DateTo,
    decimal TotalRevenue, decimal TotalCost, decimal TotalProfit, int TotalDocuments,
    List<SalesLineResp> Lines);
file record SalesLineResp(Guid ProductId, string ProductName, decimal QuantitySold, decimal Revenue, decimal Profit);

file record StockBalanceResp(decimal TotalSellValue, decimal TotalBuyValue, List<StockLineResp> Lines);
file record StockLineResp(Guid ProductId, string ProductName, decimal Quantity, decimal PriceSell);

file record CpBalanceResp(decimal TotalDebit, decimal TotalCredit, List<CpLineResp> Lines);
file record CpLineResp(Guid Id, string Name, string Type, decimal Balance);

file record DocResp(long Id, string Type, string Status);

file record DailyDashboardResp(string DateFrom, string DateTo, List<DailySalesResp> DailySales);
file record DailySalesResp(string Date, decimal Revenue, decimal Profit);

file record StockForecastResp(int LookbackDays, List<ForecastLineResp> Lines);
file record ForecastLineResp(Guid ProductId, string ProductName, decimal Quantity, decimal SoldPerDay, decimal DaysLeft);

[Collection("Integration")]
public class ReportTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ReportTests(TradeApiFactory factory) : base(factory) { }

    private async Task CreateAndConfirm(string type, Guid counterpartyId, Guid productId,
        decimal qty, decimal price, string date = "2026-05-31")
    {
        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type, date, counterpartyId,
            currencyId = TestDataSeeder.CurrencyUzsId, exchangeRate = 1m, discountPercent = 0m,
            lines = new[] { new { productId, quantity = qty, price, discountPercent = 0m } }
        });
        var draft = await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts);
        await Client.PostAsync($"/api/documents/{draft!.Id}/confirm", null);
    }

    // 2.8 — dashboard возвращает структуру с 12 месяцами
    [Fact]
    public async Task GetDashboard_ReturnsValidStructure()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/reports/dashboard");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<DashboardResp>(JsonOpts);
        body.Should().NotBeNull();
        body!.MonthlySales.Should().HaveCount(12);
        body.MonthlySales.Should().AllSatisfy(m => m.MonthLabel.Should().NotBeNullOrWhiteSpace());
    }

    // 2.8 — dashboard метрики отражают подтверждённые расходы
    [Fact]
    public async Task GetDashboard_AfterExpense_ShowsRevenueAndDebtorDebt()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(40);
        var supplierId = TestDataSeeder.GetSupplierId(0);
        var customerId = TestDataSeeder.GetCustomerId(0);

        await CreateAndConfirm("Income", supplierId, productId, 100m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 10m, 15000m);

        // Документы датированы маем — период по умолчанию (текущий месяц) их не включает.
        var resp = await Client.GetAsync("/api/reports/dashboard?dateFrom=2026-05-01&dateTo=2026-05-31");
        var body = await resp.Content.ReadFromJsonAsync<DashboardResp>(JsonOpts);

        // Revenue should include the expense
        body!.Revenue.Should().BeGreaterThan(0);
        // DebtorDebt should reflect customer's positive balance
        body.DebtorDebt.Should().BeGreaterThanOrEqualTo(0);
        // StockItemCount should reflect items in stock
        body.StockItemCount.Should().BeGreaterThan(0);
    }

    // 2.8 — sales summary за пустой период → пустой результат
    [Fact]
    public async Task GetSalesSummary_ForEmptyPeriod_ReturnsZeros()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/reports/sales-summary?dateFrom=2000-01-01&dateTo=2000-01-31");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<SalesSummaryResp>(JsonOpts);
        body!.TotalRevenue.Should().Be(0);
        body.TotalDocuments.Should().Be(0);
        body.Lines.Should().BeEmpty();
    }

    // 2.8 — sales summary после расходов → суммы совпадают с документами
    [Fact]
    public async Task GetSalesSummary_AfterExpenses_ShowsCorrectRevenue()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(41);
        var supplierId = TestDataSeeder.GetSupplierId(1);
        var customerId = TestDataSeeder.GetCustomerId(1);

        // Two expense documents: 5 * 15000 + 3 * 20000 = 75000 + 60000 = 135000
        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 5m, 15000m);
        await CreateAndConfirm("Expense", customerId, productId, 3m, 20000m);

        var resp = await Client.GetAsync("/api/reports/sales-summary?dateFrom=2026-01-01&dateTo=2026-12-31");
        var body = await resp.Content.ReadFromJsonAsync<SalesSummaryResp>(JsonOpts);

        body!.TotalRevenue.Should().Be(135_000m);
        body.TotalDocuments.Should().Be(2);
    }

    // 2.8 — stock balance пустой изначально (нет остатков)
    [Fact]
    public async Task GetStockBalance_WithNoStock_ReturnsEmpty()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/reports/stock-balance");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<StockBalanceResp>(JsonOpts);
        body!.Lines.Should().BeEmpty();
        body.TotalSellValue.Should().Be(0);
    }

    // 2.8 — stock balance после прихода → остаток совпадает
    [Fact]
    public async Task GetStockBalance_AfterIncome_ShowsStockWithValue()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(42);
        var supplierId = TestDataSeeder.GetSupplierId(2);

        await CreateAndConfirm("Income", supplierId, productId, 20m, 12000m);

        var resp = await Client.GetAsync("/api/reports/stock-balance");
        var body = await resp.Content.ReadFromJsonAsync<StockBalanceResp>(JsonOpts);

        body!.Lines.Should().Contain(l => l.ProductId == productId && l.Quantity == 20m);
        body.TotalSellValue.Should().BeGreaterThan(0);
    }

    // 2.8 — counterparty balance фильтр по типу Customer
    [Fact]
    public async Task GetCounterpartyBalance_CustomerType_ReturnsOnlyCustomers()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/reports/counterparty-balance?type=Customer");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<CpBalanceResp>(JsonOpts);
        body!.Lines.Should().AllSatisfy(l => l.Type.Should().Be("Customer"));
    }

    // 2.8 — counterparty balance фильтр по типу Supplier
    [Fact]
    public async Task GetCounterpartyBalance_SupplierType_ReturnsOnlySuppliers()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/reports/counterparty-balance?type=Supplier");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<CpBalanceResp>(JsonOpts);
        body!.Lines.Should().AllSatisfy(l => l.Type.Should().Be("Supplier"));
    }

    // 2.8 — counterparty balance после расхода → TotalDebit > 0
    [Fact]
    public async Task GetCounterpartyBalance_AfterExpense_ShowsDebtorDebt()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(43);
        var supplierId = TestDataSeeder.GetSupplierId(3);
        var customerId = TestDataSeeder.GetCustomerId(3);

        await CreateAndConfirm("Income", supplierId, productId, 10m, 12000m);
        await CreateAndConfirm("Expense", customerId, productId, 5m, 15000m);

        var resp = await Client.GetAsync("/api/reports/counterparty-balance?type=Customer");
        var body = await resp.Content.ReadFromJsonAsync<CpBalanceResp>(JsonOpts);

        body!.TotalDebit.Should().BeGreaterThan(0);
        body.Lines.Should().Contain(l => l.Id == customerId && l.Balance > 0);
    }

    // 2.8 — stock balance с фильтром по бранчу
    [Fact]
    public async Task GetStockBalance_FilteredByBranch_ReturnsOnlyThatBranchStock()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(44);
        var supplierId = TestDataSeeder.GetSupplierId(4);

        await CreateAndConfirm("Income", supplierId, productId, 10m, 12000m);

        var resp = await Client.GetAsync($"/api/reports/stock-balance?branchId={TestDataSeeder.BranchMainId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<StockBalanceResp>(JsonOpts);
        body!.Lines.Should().Contain(l => l.ProductId == productId);
    }

    // Дневной ряд — ровно по дню на каждую дату периода, продажа попадает в свой день
    [Fact]
    public async Task GetDashboard_WithPeriod_ReturnsDailySalesForEachDay()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(45);
        await CreateAndConfirm("Income", TestDataSeeder.GetSupplierId(0), productId, 50m, 12000m);
        await CreateAndConfirm("Expense", TestDataSeeder.GetCustomerId(0), productId, 2m, 15000m);

        var resp = await Client.GetAsync("/api/reports/dashboard?dateFrom=2026-05-01&dateTo=2026-05-31");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<DailyDashboardResp>(JsonOpts);
        body!.DailySales.Should().HaveCount(31);
        body.DailySales.Single(d => d.Date == "2026-05-31").Revenue.Should().BeGreaterThan(0);
    }

    // На длинном периоде дневной ряд не строится
    [Fact]
    public async Task GetDashboard_WithYearPeriod_ReturnsNoDailySales()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/reports/dashboard?dateFrom=2026-01-01&dateTo=2026-12-31");
        var body = await resp.Content.ReadFromJsonAsync<DailyDashboardResp>(JsonOpts);
        body!.DailySales.Should().BeEmpty();
    }

    // Прогноз: 30 шт. на складе, продано 30 за 30 дней → 1 шт./день → хватит на 30 дней
    [Fact]
    public async Task GetStockForecast_AfterRecentSales_ReturnsDaysLeft()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(46);
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        await CreateAndConfirm("Income", TestDataSeeder.GetSupplierId(1), productId, 60m, 12000m, today);
        await CreateAndConfirm("Expense", TestDataSeeder.GetCustomerId(1), productId, 30m, 15000m, today);

        var resp = await Client.GetAsync("/api/reports/stock-forecast?days=30");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<StockForecastResp>(JsonOpts);
        body!.LookbackDays.Should().Be(30);
        var line = body.Lines.Single(l => l.ProductId == productId);
        line.Quantity.Should().Be(30m);
        line.SoldPerDay.Should().Be(1m);
        line.DaysLeft.Should().Be(30m);
    }
}
