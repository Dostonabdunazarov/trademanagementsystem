using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Security;

internal record DocResp(long Id, string Number, string Status, decimal TotalAmount, decimal TotalAmountBase, decimal? Amount, Guid? AccountId, string? AccountName);
internal record ProblemResp(int Status, string? Code);
internal record DashboardResp(decimal Revenue, decimal Profit, decimal DebtorDebt, decimal CreditorDebt);
internal record SalesSummaryResp(decimal TotalRevenue, decimal TotalCost, decimal TotalProfit);

/// <summary>Регрессионные тесты на пункты AUDIT_2026-09-29.md.</summary>
[Collection("Integration")]
public class AuditFixTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public AuditFixTests(TradeApiFactory factory) : base(factory) { }

    private Task<HttpResponseMessage> CreateGoods(string type, Guid counterpartyId, Guid productId,
        decimal qty, decimal price, decimal docDiscount = 0m, string date = "2026-05-31") =>
        Client.PostAsJsonAsync("/api/documents", new
        {
            type,
            date,
            counterpartyId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = docDiscount,
            lines = new[] { new { productId, quantity = qty, price, discountPercent = 0m } }
        });

    private async Task<DocResp> CreateAndConfirmGoods(string type, Guid counterpartyId, Guid productId,
        decimal qty, decimal price, decimal docDiscount = 0m, string date = "2026-05-31")
    {
        var resp = await CreateGoods(type, counterpartyId, productId, qty, price, docDiscount, date);
        resp.EnsureSuccessStatusCode();
        var draft = (await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;
        var confirm = await Client.PostAsync($"/api/documents/{draft.Id}/confirm", null);
        confirm.EnsureSuccessStatusCode();
        return (await confirm.Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;
    }

    private Task<HttpResponseMessage> CreatePayment(string type, Guid counterpartyId, decimal amount, Guid? accountId) =>
        Client.PostAsJsonAsync("/api/documents", new
        {
            type,
            date = "2026-05-31",
            counterpartyId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            amount,
            accountId,
            lines = Array.Empty<object>()
        });

    private async Task<Guid> AddWarehouseAccountAsync()
    {
        var id = Guid.NewGuid();
        using var db = Db;
        db.Accounts.Add(new Account
        {
            Id = id,
            CompanyId = TestDataSeeder.CompanyId,
            BranchId = TestDataSeeder.BranchWarehouseId,
            Name = "Касса склада",
            Type = AccountType.Cash,
            CurrencyId = TestDataSeeder.CurrencyUzsId,
        });
        await db.SaveChangesAsync();
        return id;
    }

    private static async Task<string?> CodeOf(HttpResponseMessage resp) =>
        (await resp.Content.ReadFromJsonAsync<ProblemResp>(JsonOpts))?.Code;

    // SEC-1 — касса чужого филиала
    [Fact]
    public async Task Payment_WithAccountOfAnotherBranch_IsRejected()
    {
        var warehouseAccount = await AddWarehouseAccountAsync();
        await AuthenticateAsync(TestDataSeeder.CashierEmail, TestDataSeeder.CashierPassword);

        var resp = await CreatePayment("PayIn", TestDataSeeder.GetCustomerId(0), 1000m, warehouseAccount);

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("accountBranchMismatch");
        (await Db.Accounts.FindAsync(warehouseAccount))!.Balance.Should().Be(0);
    }

    // SEC-1 — контрагент другой компании
    [Fact]
    public async Task Document_WithCounterpartyOfAnotherCompany_IsRejected()
    {
        var otherCompany = Guid.NewGuid();
        var foreignCp = Guid.NewGuid();
        using (var db = Db)
        {
            db.Companies.Add(new Company { Id = otherCompany, Name = "Other", CreatedAt = DateTime.UtcNow });
            db.Counterparties.Add(new Counterparty
            {
                Id = foreignCp, CompanyId = otherCompany, Type = CounterpartyType.Customer,
                Name = "Чужой клиент", CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();
        }
        await AuthenticateAsync();

        var resp = await CreateGoods("Expense", foreignCp, TestDataSeeder.GetProductId(1), 1m, 100m);

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("invalidCounterparty");
    }

    // Payment must have an account (no silent balance change without a cash movement)
    [Fact]
    public async Task Payment_WithoutAccount_IsRejected()
    {
        await AuthenticateAsync();
        var resp = await CreatePayment("PayIn", TestDataSeeder.GetCustomerId(0), 1000m, null);
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // SEC-4 — кассир не отменяет проведённые документы
    [Fact]
    public async Task Cashier_CannotCancelConfirmedDocument()
    {
        await AuthenticateAsync();
        var doc = await CreateAndConfirmGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(2), 5m, 100m);

        await AuthenticateAsync(TestDataSeeder.CashierEmail, TestDataSeeder.CashierPassword);
        var resp = await Client.PostAsync($"/api/documents/{doc.Id}/cancel", null);

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // SEC-3 — не-админ не читает документ чужого филиала по id
    [Fact]
    public async Task Cashier_CannotReadDocumentOfAnotherBranch()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/documents", new
        {
            type = "Income",
            date = "2026-05-31",
            branchId = TestDataSeeder.BranchWarehouseId,
            counterpartyId = TestDataSeeder.GetSupplierId(0),
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            lines = new[] { new { productId = TestDataSeeder.GetProductId(3), quantity = 1m, price = 10m, discountPercent = 0m } }
        });
        resp.EnsureSuccessStatusCode();
        var doc = (await resp.Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;

        await AuthenticateAsync(TestDataSeeder.CashierEmail, TestDataSeeder.CashierPassword);
        var read = await Client.GetAsync($"/api/documents/{doc.Id}");

        read.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // SEC-3 — список пользователей только для Admin
    [Fact]
    public async Task Cashier_CannotListUsers()
    {
        await AuthenticateAsync(TestDataSeeder.CashierEmail, TestDataSeeder.CashierPassword);
        var resp = await Client.GetAsync("/api/users");
        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // SEC-3 — кассы: не-админ видит только свой филиал, параметр запроса игнорируется
    [Fact]
    public async Task Cashier_SeesOnlyOwnBranchAccounts()
    {
        await AddWarehouseAccountAsync();
        await AuthenticateAsync(TestDataSeeder.CashierEmail, TestDataSeeder.CashierPassword);

        var resp = await Client.GetAsync($"/api/accounts?branchId={TestDataSeeder.BranchWarehouseId}");
        var accounts = await resp.Content.ReadFromJsonAsync<List<JsonElement>>(JsonOpts);

        accounts!.Should().NotBeEmpty();
        accounts!.Select(a => a.GetProperty("branchId").GetGuid())
            .Should().OnlyContain(b => b == TestDataSeeder.BranchMainId);
    }

    // BIZ-2 — удалённый черновик не освобождает номер
    [Fact]
    public async Task DeletingDraft_DoesNotCauseDuplicateNumbers()
    {
        await AuthenticateAsync();
        var first = (await (await CreateGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(4), 1m, 10m))
            .Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;
        var second = (await (await CreateGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(4), 1m, 10m))
            .Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;

        (await Client.DeleteAsync($"/api/documents/{first.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var third = (await (await CreateGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(4), 1m, 10m))
            .Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;

        third.Number.Should().NotBe(second.Number);
        third.Number.Should().NotBe(first.Number);
    }

    // BIZ-6 — платёжный черновик редактируется через PUT и проводится с новой суммой
    [Fact]
    public async Task PaymentDraft_CanBeUpdatedAndConfirmed()
    {
        await AuthenticateAsync();
        var customerId = TestDataSeeder.GetCustomerId(1);
        var draft = (await (await CreatePayment("PayIn", customerId, 1000m, TestDataSeeder.AccountCashId))
            .Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;

        var put = await Client.PutAsJsonAsync($"/api/documents/{draft.Id}", new
        {
            date = "2026-05-31",
            counterpartyId = customerId,
            currencyId = TestDataSeeder.CurrencyUzsId,
            exchangeRate = 1m,
            discountPercent = 0m,
            note = (string?)null,
            lines = Array.Empty<object>(),
            amount = 2500m,
            paymentMethod = "Cash",
            accountId = TestDataSeeder.AccountCashId
        });
        put.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = (await put.Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;
        updated.TotalAmount.Should().Be(2500m);
        updated.AccountName.Should().NotBeNull();

        (await Client.PostAsync($"/api/documents/{draft.Id}/confirm", null)).EnsureSuccessStatusCode();

        (await Db.Accounts.FindAsync(TestDataSeeder.AccountCashId))!.Balance.Should().Be(2500m);
        (await Db.Counterparties.FindAsync(customerId))!.Balance.Should().Be(-2500m);
    }

    // BIZ-3/BIZ-4 — выручка с учётом скидки документа, себестоимость фиксируется при проведении
    [Fact]
    public async Task Reports_UseDocumentDiscountAndCostAtConfirmTime()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(5);
        using (var db = Db)
        {
            var product = await db.Products.FindAsync(productId);
            product!.PriceBuy = 60m;
            await db.SaveChangesAsync();
        }

        await CreateAndConfirmGoods("Income", TestDataSeeder.GetSupplierId(0), productId, 10m, 60m);
        // 10 × 100 = 1000, скидка документа 10% → 900
        await CreateAndConfirmGoods("Expense", TestDataSeeder.GetCustomerId(2), productId, 10m, 100m, docDiscount: 10m);

        // Закупочная цена поменялась после продажи — прибыль прошлого периода не должна измениться.
        using (var db = Db)
        {
            var product = await db.Products.FindAsync(productId);
            product!.PriceBuy = 90m;
            await db.SaveChangesAsync();
        }

        var summary = await Client.GetFromJsonAsync<SalesSummaryResp>(
            "/api/reports/sales-summary?dateFrom=2026-05-01&dateTo=2026-05-31", JsonOpts);
        summary!.TotalRevenue.Should().Be(900m);
        summary.TotalCost.Should().Be(600m);
        summary.TotalProfit.Should().Be(300m);

        var dash = await Client.GetFromJsonAsync<DashboardResp>(
            "/api/reports/dashboard?dateFrom=2026-05-01&dateTo=2026-05-31", JsonOpts);
        dash!.Revenue.Should().Be(900m);
        dash.Profit.Should().Be(300m);
    }

    // BIZ-8 — предоплата одного клиента не гасит долг другого
    [Fact]
    public async Task Dashboard_DebtsAreComputedPerCounterparty()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(6);
        await CreateAndConfirmGoods("Income", TestDataSeeder.GetSupplierId(0), productId, 10m, 50m);
        await CreateAndConfirmGoods("Expense", TestDataSeeder.GetCustomerId(3), productId, 1m, 1000m);

        var prepay = (await (await CreatePayment("PayIn", TestDataSeeder.GetCustomerId(4), 500m, TestDataSeeder.AccountCashId))
            .Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;
        (await Client.PostAsync($"/api/documents/{prepay.Id}/confirm", null)).EnsureSuccessStatusCode();

        var dash = await Client.GetFromJsonAsync<DashboardResp>("/api/reports/dashboard", JsonOpts);
        dash!.DebtorDebt.Should().Be(1000m);
        dash.CreditorDebt.Should().Be(500m + 500m); // поставщику 500 за приход + предоплата клиента 500
    }

    // Штучный товар — только целое количество
    [Fact]
    public async Task PieceProduct_RejectsFractionalQuantity()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(7);
        using (var db = Db)
        {
            var product = await db.Products.FindAsync(productId);
            product!.Unit = ProductUnit.Pcs;
            await db.SaveChangesAsync();
        }

        var resp = await CreateGoods("Income", TestDataSeeder.GetSupplierId(0), productId, 1.5m, 10m);

        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await resp.Content.ReadAsStringAsync()).Should().Contain("lineQuantityInteger");
    }

    // SEC-7 — нельзя деактивировать себя
    [Fact]
    public async Task Admin_CannotDeactivateSelf()
    {
        await AuthenticateAsync();
        var resp = await Client.PutAsJsonAsync($"/api/users/{TestDataSeeder.UserAdminId}", new
        {
            fullName = "Администратор",
            role = "Admin",
            isActive = false,
            branchId = TestDataSeeder.BranchMainId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("cannotModifySelf");
    }

    // SEC-7 — нельзя разжаловать последнего активного админа. Сам себя админ менять не может,
    // поэтому сценарий — второй админ с ещё живым токеном, которого уже деактивировали в БД.
    [Fact]
    public async Task LastActiveAdmin_CannotBeDemoted()
    {
        await AuthenticateAsync(TestDataSeeder.AdminNoBranchEmail, TestDataSeeder.AdminNoBranchPassword);
        using (var db = Db)
        {
            var actor = await db.Users.FindAsync(TestDataSeeder.UserAdminNoBranchId);
            actor!.IsActive = false;
            await db.SaveChangesAsync();
        }

        var resp = await Client.PutAsJsonAsync($"/api/users/{TestDataSeeder.UserAdminId}", new
        {
            fullName = "Администратор",
            role = "Cashier",
            isActive = true,
            branchId = TestDataSeeder.BranchMainId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("lastAdmin");
    }

    // SEC-6 — смена роли отзывает refresh-токен
    [Fact]
    public async Task RoleChange_RevokesRefreshToken()
    {
        var login = await Client.PostAsJsonAsync("/api/auth/login",
            new { email = TestDataSeeder.CashierEmail, password = TestDataSeeder.CashierPassword });
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>(JsonOpts);
        var refresh = tokens.GetProperty("refreshToken").GetString();

        await AuthenticateAsync();
        (await Client.PutAsJsonAsync($"/api/users/{TestDataSeeder.UserCashierId}", new
        {
            fullName = "Кассир",
            role = "Manager",
            isActive = true,
            branchId = TestDataSeeder.BranchMainId
        })).EnsureSuccessStatusCode();

        var refreshResp = await Client.PostAsJsonAsync("/api/auth/refresh", new { refreshToken = refresh });
        refreshResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // SEC-2 — Manager/Cashier без филиала создать нельзя
    [Fact]
    public async Task CreateCashier_WithoutBranch_IsRejected()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/users", new
        {
            fullName = "Новый кассир",
            email = "new-cashier@test.com",
            password = "Password123!",
            role = "Cashier",
            branchId = (Guid?)null
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("branchRequiredForRole");
    }

    // Login — единый ответ, email без учёта регистра
    [Fact]
    public async Task Login_IsCaseInsensitive_AndFailuresAreUniform()
    {
        var ok = await Client.PostAsJsonAsync("/api/auth/login",
            new { email = TestDataSeeder.AdminEmail.ToUpperInvariant(), password = TestDataSeeder.AdminPassword });
        ok.StatusCode.Should().Be(HttpStatusCode.OK);

        var wrongPassword = await Client.PostAsJsonAsync("/api/auth/login",
            new { email = TestDataSeeder.AdminEmail, password = "wrong-password" });
        var unknownUser = await Client.PostAsJsonAsync("/api/auth/login",
            new { email = "nobody@test.com", password = "wrong-password" });

        wrongPassword.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        unknownUser.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await CodeOf(wrongPassword)).Should().Be("invalidCredentials");
        (await CodeOf(unknownUser)).Should().Be("invalidCredentials");
    }

    // Lockout — атомарный счётчик неудачных попыток
    [Fact]
    public async Task ParallelFailedLogins_AreAllCounted()
    {
        var attempts = Enumerable.Range(0, 8).Select(_ => Client.PostAsJsonAsync("/api/auth/login",
            new { email = TestDataSeeder.ManagerEmail, password = "wrong-password" }));
        await Task.WhenAll(attempts);

        var manager = await Db.Users.AsNoTracking().FirstAsync(u => u.Id == TestDataSeeder.UserManagerId);
        manager.FailedLoginCount.Should().Be(8);
        manager.LockoutUntil.Should().NotBeNull();
    }

    // BIZ-5 — базовую валюту нельзя сменить после проводок
    [Fact]
    public async Task BaseCurrency_CannotBeChangedAfterPostings()
    {
        await AuthenticateAsync();
        await CreateAndConfirmGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(8), 1m, 10m);

        var resp = await Client.PostAsJsonAsync("/api/currencies", new { code = "EUR", name = "Euro", isBase = true });

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("baseCurrencyLocked");
    }

    // Удаление контрагента с долгом запрещено
    [Fact]
    public async Task Counterparty_WithBalance_CannotBeDeleted()
    {
        await AuthenticateAsync();
        var supplierId = TestDataSeeder.GetSupplierId(1);
        await CreateAndConfirmGoods("Income", supplierId, TestDataSeeder.GetProductId(9), 1m, 10m);

        var resp = await Client.DeleteAsync($"/api/counterparties/{supplierId}");

        resp.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await CodeOf(resp)).Should().Be("counterpartyHasBalance");
    }

    // Поиск в журнале — на сервере, по номеру
    [Fact]
    public async Task Documents_SearchByNumber_IsServerSide()
    {
        await AuthenticateAsync();
        var doc = (await (await CreateGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(10), 1m, 10m))
            .Content.ReadFromJsonAsync<DocResp>(JsonOpts))!;
        await CreateGoods("Income", TestDataSeeder.GetSupplierId(0), TestDataSeeder.GetProductId(10), 1m, 10m);

        var resp = await Client.GetFromJsonAsync<JsonElement>(
            $"/api/documents?search={doc.Number.ToLowerInvariant()}&pageSize=100000", JsonOpts);

        resp.GetProperty("totalCount").GetInt32().Should().Be(1);
        resp.GetProperty("pageSize").GetInt32().Should().Be(200);
        resp.GetProperty("items")[0].GetProperty("totalAmountBase").GetDecimal().Should().Be(10m);
    }
}
