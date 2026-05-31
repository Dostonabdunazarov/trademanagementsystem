using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Counterparties;

file record CounterpartyResp(Guid Id, string Name, string Type, string Phone, decimal Balance, decimal CreditLimit);
file record PagedResp<T>(List<T> Items, int TotalCount, int Page, int PageSize);

[Collection("Integration")]
public class CounterpartyTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public CounterpartyTests(TradeApiFactory factory) : base(factory) { }

    // 2.3 — фильтр по Supplier → 25
    [Fact]
    public async Task GetCounterparties_WithSupplierFilter_Returns25()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/counterparties?type=Supplier&pageSize=50");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<CounterpartyResp>>(JsonOpts);
        body!.TotalCount.Should().Be(25);
        body.Items.Should().AllSatisfy(c => c.Type.Should().Be("Supplier"));
    }

    // 2.3 — фильтр по Customer → 25
    [Fact]
    public async Task GetCounterparties_WithCustomerFilter_Returns25()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/counterparties?type=Customer&pageSize=50");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<CounterpartyResp>>(JsonOpts);
        body!.TotalCount.Should().Be(25);
        body.Items.Should().AllSatisfy(c => c.Type.Should().Be("Customer"));
    }

    // 2.3 — без фильтра — все 50
    [Fact]
    public async Task GetCounterparties_NoFilter_Returns50()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/counterparties?pageSize=100");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<CounterpartyResp>>(JsonOpts);
        body!.TotalCount.Should().Be(50);
    }

    // 2.3 — создать нового поставщика
    [Fact]
    public async Task CreateSupplier_WithValidData_Returns201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/counterparties", new
        {
            type = "Supplier",
            name = "Новый поставщик",
            phone = "+998901234567",
            address = "г. Ташкент, ул. Тест, 1",
            creditLimit = 10_000_000m
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<CounterpartyResp>(JsonOpts);
        body!.Name.Should().Be("Новый поставщик");
        body.Type.Should().Be("Supplier");
        body.Balance.Should().Be(0);
    }

    // 2.3 — создать нового покупателя
    [Fact]
    public async Task CreateCustomer_WithValidData_Returns201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/counterparties", new
        {
            type = "Customer",
            name = "Новый покупатель",
            phone = "+998911234567",
            address = "г. Ташкент, ул. Тест, 2",
            creditLimit = 5_000_000m
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<CounterpartyResp>(JsonOpts);
        body!.Type.Should().Be("Customer");
        body.Balance.Should().Be(0);
    }

    // 2.3 — обновление контрагента
    [Fact]
    public async Task UpdateCounterparty_ChangesNameAndCreditLimit()
    {
        await AuthenticateAsync();
        var id = TestDataSeeder.GetCustomerId(0);

        var resp = await Client.PutAsJsonAsync($"/api/counterparties/{id}", new
        {
            type = "Customer",
            name = "Обновлённый покупатель",
            phone = "+998901111111",
            address = "г. Ташкент",
            creditLimit = 99_000_000m
        });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<CounterpartyResp>(JsonOpts);
        body!.Name.Should().Be("Обновлённый покупатель");
        body.CreditLimit.Should().Be(99_000_000m);
    }

    // 2.3 — мягкое удаление
    [Fact]
    public async Task DeleteCounterparty_ReturnsNoContent()
    {
        await AuthenticateAsync();
        var id = TestDataSeeder.GetCustomerId(24);

        var resp = await Client.DeleteAsync($"/api/counterparties/{id}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // 2.3 — удалённый контрагент не возвращается в списке
    [Fact]
    public async Task GetCounterparties_AfterDelete_CountDecreases()
    {
        await AuthenticateAsync();
        var id = TestDataSeeder.GetCustomerId(24);

        await Client.DeleteAsync($"/api/counterparties/{id}");

        var resp = await Client.GetAsync("/api/counterparties?type=Customer&pageSize=50");
        var body = await resp.Content.ReadFromJsonAsync<PagedResp<CounterpartyResp>>(JsonOpts);
        body!.TotalCount.Should().Be(24);
    }

    // 2.3 — поиск по имени
    [Fact]
    public async Task GetCounterparties_SearchByName_ReturnsFiltered()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/counterparties?search=АльфаСнаб");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<CounterpartyResp>>(JsonOpts);
        body!.TotalCount.Should().BeGreaterThan(0);
        body.Items.Should().AllSatisfy(c => c.Name.Should().Contain("АльфаСнаб"));
    }
}
