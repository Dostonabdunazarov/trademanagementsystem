using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Products;

file record GroupResp(Guid Id, string Name, Guid? ParentId, List<GroupResp> Children);
file record ProductResp(Guid Id, string Name, string Sku, string Barcode, decimal PriceSell, decimal PriceBuy, bool IsActive, Guid? GroupId);
file record PagedResp<T>(List<T> Items, int TotalCount, int Page, int PageSize);

[Collection("Integration")]
public class ProductTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public ProductTests(TradeApiFactory factory) : base(factory) { }

    // 2.2 — создать 20 групп → проверить список
    [Fact]
    public async Task GetProductGroups_Returns20SeededGroups()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/product-groups");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var groups = await resp.Content.ReadFromJsonAsync<List<GroupResp>>(JsonOpts);
        groups.Should().HaveCount(20);
        groups.Should().AllSatisfy(g => g.Id.Should().NotBeEmpty());
    }

    // 2.2 — создать новую группу
    [Fact]
    public async Task CreateProductGroup_WithValidName_Returns201()
    {
        await AuthenticateAsync();
        var resp = await Client.PostAsJsonAsync("/api/product-groups", new
        {
            name = "Тестовая группа"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<GroupResp>(JsonOpts);
        body!.Name.Should().Be("Тестовая группа");
        body.Id.Should().NotBeEmpty();
    }

    // 2.2 — дочерняя группа
    [Fact]
    public async Task CreateProductGroup_WithParent_ReturnsChildGroup()
    {
        await AuthenticateAsync();
        var parentId = TestDataSeeder.GetProductGroupId(0);

        var resp = await Client.PostAsJsonAsync("/api/product-groups", new
        {
            name = "Подгруппа",
            parentId = parentId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<GroupResp>(JsonOpts);
        body!.ParentId.Should().Be(parentId);
    }

    // 2.2 — список продуктов с пагинацией
    [Fact]
    public async Task GetProducts_ReturnsPagedResult_TotalCount200()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/products?page=1&pageSize=10");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<ProductResp>>(JsonOpts);
        body.Should().NotBeNull();
        body!.TotalCount.Should().Be(200);
        body.Items.Should().HaveCount(10);
    }

    // 2.2 — фильтр по группе → 10 продуктов
    [Fact]
    public async Task GetProducts_FilteredByGroup_Returns10Products()
    {
        await AuthenticateAsync();
        var groupId = TestDataSeeder.GetProductGroupId(0);
        var resp = await Client.GetAsync($"/api/products?groupId={groupId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<ProductResp>>(JsonOpts);
        body!.TotalCount.Should().Be(10);
        body.Items.Should().AllSatisfy(p => p.GroupId.Should().Be(groupId));
    }

    // 2.2 — поиск по sku
    [Fact]
    public async Task GetProducts_SearchBySku_ReturnsMatchingProduct()
    {
        await AuthenticateAsync();
        var resp = await Client.GetAsync("/api/products?search=SKU-00001");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<PagedResp<ProductResp>>(JsonOpts);
        body!.TotalCount.Should().Be(1);
        body.Items[0].Sku.Should().Be("SKU-00001");
    }

    // 2.2 — GET /products/{id}
    [Fact]
    public async Task GetProductById_ReturnsProduct()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(1);
        var resp = await Client.GetAsync($"/api/products/{productId}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<ProductResp>(JsonOpts);
        body!.Id.Should().Be(productId);
        body.Name.Should().NotBeNullOrWhiteSpace();
    }

    // 2.2 — создать продукт
    [Fact]
    public async Task CreateProduct_WithValidData_Returns201AndIsActive()
    {
        await AuthenticateAsync();
        var groupId = TestDataSeeder.GetProductGroupId(0);

        var resp = await Client.PostAsJsonAsync("/api/products", new
        {
            groupId = groupId,
            name = "Новый тестовый товар",
            sku = "TST-99999",
            barcode = "8690000000001",
            unit = "Pcs",
            priceSell = 15000m,
            priceBuy = 12000m,
            currencyId = TestDataSeeder.CurrencyUzsId
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        var body = await resp.Content.ReadFromJsonAsync<ProductResp>(JsonOpts);
        body!.Name.Should().Be("Новый тестовый товар");
        body.PriceSell.Should().Be(15000m);
        body.IsActive.Should().BeTrue();
    }

    // 2.2 — обновление продукта
    [Fact]
    public async Task UpdateProduct_ChangesNameAndPrice()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(1);

        var resp = await Client.PutAsJsonAsync($"/api/products/{productId}", new
        {
            name = "Обновлённое имя",
            sku = "SKU-00001",
            barcode = "8690000000001",
            unit = "Pcs",
            priceSell = 99999m,
            priceBuy = 88888m,
            currencyId = TestDataSeeder.CurrencyUzsId,
            isActive = true
        });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<ProductResp>(JsonOpts);
        body!.Name.Should().Be("Обновлённое имя");
        body.PriceSell.Should().Be(99999m);
    }

    // 2.2 — удаление продукта → 204
    [Fact]
    public async Task DeleteProduct_ReturnsNoContent()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(200);

        var resp = await Client.DeleteAsync($"/api/products/{productId}");
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // 2.2 — после удаления totalCount уменьшился
    [Fact]
    public async Task GetProducts_AfterDelete_TotalCountDecreases()
    {
        await AuthenticateAsync();
        var productId = TestDataSeeder.GetProductId(200);

        await Client.DeleteAsync($"/api/products/{productId}");

        var listResp = await Client.GetAsync("/api/products?page=1&pageSize=5");
        var body = await listResp.Content.ReadFromJsonAsync<PagedResp<ProductResp>>(JsonOpts);
        body!.TotalCount.Should().Be(199);
    }
}
