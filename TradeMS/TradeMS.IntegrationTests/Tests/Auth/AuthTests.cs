using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TradeMS.IntegrationTests.Infrastructure;
using TradeMS.IntegrationTests.Seeders;

namespace TradeMS.IntegrationTests.Tests.Auth;

file record LoginResp(string AccessToken, string RefreshToken);
file record TokenUser(Guid Id, string Email, string Role);
file record LoginFullResp(string AccessToken, string RefreshToken, TokenUser User);

[Collection("Integration")]
public class AuthTests : SeededIntegrationTestBase
{
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public AuthTests(TradeApiFactory factory) : base(factory) { }

    // 2.1 — успешный логин → получить JWT
    [Fact]
    public async Task Login_WithValidCredentials_Returns200WithTokens()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = TestDataSeeder.AdminEmail,
            password = TestDataSeeder.AdminPassword
        });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var body = await resp.Content.ReadFromJsonAsync<LoginFullResp>(JsonOpts);
        body.Should().NotBeNull();
        body!.AccessToken.Should().NotBeNullOrWhiteSpace();
        body.RefreshToken.Should().NotBeNullOrWhiteSpace();
        body.User.Email.Should().Be(TestDataSeeder.AdminEmail);
        body.User.Role.Should().Be("Admin");
    }

    // 2.1 — неверный пароль → 401
    [Fact]
    public async Task Login_WithWrongPassword_Returns401()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = TestDataSeeder.AdminEmail,
            password = "WrongPassword!"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // 2.1 — несуществующий email → 401
    [Fact]
    public async Task Login_WithNonExistentEmail_Returns401()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "nobody@test.com",
            password = "SomePass123!"
        });

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // 2.1 — обновление токена
    [Fact]
    public async Task RefreshToken_WithValidToken_ReturnsNewAccessToken()
    {
        var loginResp = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = TestDataSeeder.AdminEmail,
            password = TestDataSeeder.AdminPassword
        });
        var tokens = await loginResp.Content.ReadFromJsonAsync<LoginResp>(JsonOpts);

        var refreshResp = await Client.PostAsJsonAsync("/api/auth/refresh", new
        {
            refreshToken = tokens!.RefreshToken
        });

        refreshResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var newTokens = await refreshResp.Content.ReadFromJsonAsync<LoginResp>(JsonOpts);
        newTokens!.AccessToken.Should().NotBeNullOrWhiteSpace();
    }

    // 2.1 — запрос без токена → 401
    [Fact]
    public async Task ProtectedEndpoint_WithoutToken_Returns401()
    {
        var client = Factory.CreateClient();
        var resp = await client.GetAsync("/api/products");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // 2.1 — запрос с невалидным токеном → 401
    [Fact]
    public async Task ProtectedEndpoint_WithInvalidToken_Returns401()
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "invalid.token.value");
        var resp = await client.GetAsync("/api/products");
        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // Manager может логиниться
    [Fact]
    public async Task Login_ManagerCredentials_ReturnsManagerRole()
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new
        {
            email = TestDataSeeder.ManagerEmail,
            password = TestDataSeeder.ManagerPassword
        });

        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await resp.Content.ReadFromJsonAsync<LoginFullResp>(JsonOpts);
        body!.User.Role.Should().Be("Manager");
    }
}
