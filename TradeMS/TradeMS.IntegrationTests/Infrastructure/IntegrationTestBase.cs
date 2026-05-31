using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.IntegrationTests.Infrastructure;

[Collection("Integration")]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    protected readonly TradeApiFactory Factory;
    protected readonly HttpClient Client;
    protected AppDbContext Db => Factory.Services.CreateScope()
        .ServiceProvider.GetRequiredService<AppDbContext>();

    protected IntegrationTestBase(TradeApiFactory factory)
    {
        Factory = factory;
        Client = factory.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await Factory.ResetDatabaseAsync();
        await SeedAsync();
    }

    protected virtual Task SeedAsync() => Task.CompletedTask;

    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task AuthenticateAsync(string email = "admin@test.com", string password = "Admin123!")
    {
        var response = await Client.PostAsJsonAsync("/api/auth/login", new { email, password });
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<LoginResponse>();
        Client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", result!.AccessToken);
    }

    private record LoginResponse(string AccessToken, string RefreshToken);
}

[CollectionDefinition("Integration")]
public class IntegrationCollection : ICollectionFixture<TradeApiFactory> { }
