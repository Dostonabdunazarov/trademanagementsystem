using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Settings;

file record BranchResp(Guid Id, string Name, string? Address);
file record CurrencyResp(Guid Id, string Code, string Name, bool IsBase);
file record ExchangeRateResp(Guid Id, Guid FromCurrencyId, Guid ToCurrencyId, decimal Rate, string Date);
file record AccountResp(Guid Id, string Name, string Type, decimal Balance);
file record UserResp(Guid Id, string FullName, string Email, string Role, bool IsActive);

[Collection("Integration")]
public class SettingsTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public SettingsTests(TradeApiFactory factory) : base(factory) { }

    // ── 2.9 Branches ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetBranches_ReturnsSeeded2Branches()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/branches");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var branches = await resp.Content.ReadFromJsonAsync<List<BranchResp>>(JsonOpts);
        branches.Should().HaveCount(2);
        branches.Should().Contain(b => b.Id == TestDataSeeder.BranchMainId);
        branches.Should().Contain(b => b.Id == TestDataSeeder.BranchWarehouseId);
    }

    [Fact]
    public async Task CreateBranch_ReturnsNewBranchWith201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/branches", new
        {
            name = "Новый офис",
            address = "г. Самарканд, ул. Центральная, 5"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<BranchResp>(JsonOpts);
        body!.Name.Should().Be("Новый офис");
        body.Id.Should().NotBeEmpty();
    }

    [Fact]
    public async Task DeleteBranch_ReturnsNoContent()
    {
        await AuthenticateAsync();

        // Create a branch to delete
        var createResp = await Client.PostAsJsonAsync("/api/branches", new
        {
            name = "Временный офис"
        });
        var branch = await createResp.Content.ReadFromJsonAsync<BranchResp>(JsonOpts);

        var deleteResp = await Client.DeleteAsync($"/api/branches/{branch!.Id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        // Verify it's gone
        var listResp = await Client.GetAsync("/api/branches");
        var branches = await listResp.Content.ReadFromJsonAsync<List<BranchResp>>(JsonOpts);
        branches.Should().NotContain(b => b.Id == branch.Id);
    }

    // ── 2.9 Currencies ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetCurrencies_ReturnsSeeded2Currencies()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/currencies");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var currencies = await resp.Content.ReadFromJsonAsync<List<CurrencyResp>>(JsonOpts);
        currencies.Should().HaveCount(2);
        currencies.Should().Contain(c => c.Code == "UZS" && c.IsBase);
        currencies.Should().Contain(c => c.Code == "USD" && !c.IsBase);
    }

    [Fact]
    public async Task CreateCurrency_ReturnsNewCurrencyWith201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/currencies", new
        {
            code = "EUR",
            name = "Евро",
            isBase = false
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<CurrencyResp>(JsonOpts);
        body!.Code.Should().Be("EUR");
        body.IsBase.Should().BeFalse();
    }

    [Fact]
    public async Task GetExchangeRates_ReturnsSeededUsdToUzsRate()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/exchange-rates");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var rates = await resp.Content.ReadFromJsonAsync<List<ExchangeRateResp>>(JsonOpts);
        rates.Should().Contain(r =>
            r.FromCurrencyId == TestDataSeeder.CurrencyUsdId &&
            r.ToCurrencyId == TestDataSeeder.CurrencyUzsId &&
            r.Rate == 12700m);
    }

    [Fact]
    public async Task CreateExchangeRate_Returns201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/exchange-rates", new
        {
            fromCurrencyId = TestDataSeeder.CurrencyUsdId,
            toCurrencyId = TestDataSeeder.CurrencyUzsId,
            rate = 12800m,
            date = "2026-06-01"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ExchangeRateResp>(JsonOpts);
        body!.Rate.Should().Be(12800m);
    }

    [Fact]
    public async Task CreateExchangeRate_SameDayUpsert_UpdatesRate()
    {
        await AuthenticateAsync();
        // Seeded rate for today is 12700. Create another for same day — upsert.
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var resp = await Client.PostAsJsonAsync("/api/exchange-rates", new
        {
            fromCurrencyId = TestDataSeeder.CurrencyUsdId,
            toCurrencyId = TestDataSeeder.CurrencyUzsId,
            rate = 12750m,
            date = today
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ExchangeRateResp>(JsonOpts);
        body!.Rate.Should().Be(12750m);

        // Latest rate should be the new one
        var ratesResp = await Client.GetAsync("/api/exchange-rates");
        var rates = await ratesResp.Content.ReadFromJsonAsync<List<ExchangeRateResp>>(JsonOpts);
        rates.Should().Contain(r =>
            r.FromCurrencyId == TestDataSeeder.CurrencyUsdId && r.Rate == 12750m);
    }

    // ── 2.9 Accounts ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAccounts_ReturnsSeededCashAccount()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/accounts");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var accounts = await resp.Content.ReadFromJsonAsync<List<AccountResp>>(JsonOpts);
        accounts.Should().HaveCount(1);
        accounts[0].Id.Should().Be(TestDataSeeder.AccountCashId);
        accounts[0].Type.Should().Be("Cash");
    }

    [Fact]
    public async Task CreateAccount_ReturnsBankAccountWith201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/accounts", new
        {
            name = "Банковский счёт",
            type = "Bank",
            currencyId = TestDataSeeder.CurrencyUzsId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<AccountResp>(JsonOpts);
        body!.Name.Should().Be("Банковский счёт");
        body.Type.Should().Be("Bank");
        body.Balance.Should().Be(0);
    }

    [Fact]
    public async Task DeleteAccount_ReturnsNoContent()
    {
        await AuthenticateAsync();
        var createResp = await Client.PostAsJsonAsync("/api/accounts", new
        {
            name = "Временная касса",
            type = "Cash",
            currencyId = TestDataSeeder.CurrencyUzsId
        });
        var account = await createResp.Content.ReadFromJsonAsync<AccountResp>(JsonOpts);

        var deleteResp = await Client.DeleteAsync($"/api/accounts/{account!.Id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // Reproduces the production case: the default admin (admin@tradems.com) has no branch in its
    // token. Creating an account must not 500 — it needs a branchId in the body (the branch the
    // admin picked in the UI header).
    [Fact]
    public async Task CreateAccount_AdminWithoutBranch_UsesBodyBranch_Returns201()
    {
        await AuthenticateAsync(TestDataSeeder.AdminNoBranchEmail, TestDataSeeder.AdminNoBranchPassword);
        var resp = await Client.PostAsJsonAsync("/api/accounts", new
        {
            name = "Касса филиала",
            type = "Cash",
            currencyId = TestDataSeeder.CurrencyUzsId,
            branchId = TestDataSeeder.BranchMainId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<AccountResp>(JsonOpts);
        body!.Name.Should().Be("Касса филиала");
    }

    // Without a branch in the token AND without one in the body, we return a clean 400 instead of
    // a 500 FK violation.
    [Fact]
    public async Task CreateAccount_AdminWithoutBranch_NoBodyBranch_Returns400()
    {
        await AuthenticateAsync(TestDataSeeder.AdminNoBranchEmail, TestDataSeeder.AdminNoBranchPassword);
        var resp = await Client.PostAsJsonAsync("/api/accounts", new
        {
            name = "Касса без филиала",
            type = "Cash",
            currencyId = TestDataSeeder.CurrencyUzsId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ── 2.9 Users ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetUsers_ReturnsSeededUsers()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/users");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var users = await resp.Content.ReadFromJsonAsync<List<UserResp>>(JsonOpts);
        users.Should().Contain(u => u.Email == TestDataSeeder.AdminEmail && u.Role == "Admin");
        users.Should().Contain(u => u.Email == TestDataSeeder.ManagerEmail && u.Role == "Manager");
        users.Should().Contain(u => u.Email == TestDataSeeder.CashierEmail && u.Role == "Cashier");
    }

    [Fact]
    public async Task CreateUser_ReturnsNewUserWith201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/users", new
        {
            fullName = "Новый сотрудник",
            email = "new.employee@test.com",
            password = "Pass123!",
            role = "Manager",
            branchId = TestDataSeeder.BranchMainId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<UserResp>(JsonOpts);
        body!.FullName.Should().Be("Новый сотрудник");
        body.Role.Should().Be("Manager");
        body.IsActive.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateUser_ChangesRoleAndStatus()
    {
        await AuthenticateAsync();
        var userId = TestDataSeeder.UserManagerId;

        var resp = await Client.PutAsJsonAsync($"/api/users/{userId}", new
        {
            fullName = "Менеджер (обновлённый)",
            role = "Cashier",
            isActive = false
        });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<UserResp>(JsonOpts);
        body!.Role.Should().Be("Cashier");
        body.IsActive.Should().BeFalse();
    }

    [Fact]
    public async Task CreateUser_WithDuplicateEmail_ReturnsError()
    {
        await AuthenticateAsync();

        // Try to create a user with an existing email
        var resp = await Client.PostAsJsonAsync("/api/users", new
        {
            fullName = "Дубликат",
            email = TestDataSeeder.AdminEmail,
            password = "Pass123!",
            role = "Cashier"
        });

        resp.IsSuccessStatusCode.Should().BeFalse();
    }
}
