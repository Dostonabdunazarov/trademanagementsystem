using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Respawn;
using Testcontainers.PostgreSql;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.IntegrationTests.Infrastructure;

public class TradeApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    // Без Docker можно указать готовую пустую тестовую БД:
    //   TRADEMS_TEST_DB="Host=127.0.0.1;Port=6543;Database=tradems_test;Username=postgres"
    // Она будет очищаться Respawn'ом между тестами — не указывайте рабочую базу.
    private static readonly string? ExternalDb = Environment.GetEnvironmentVariable("TRADEMS_TEST_DB");

    private readonly PostgreSqlContainer? _db = ExternalDb is null
        ? new PostgreSqlBuilder()
            .WithImage("postgres:16-alpine")
            .WithDatabase("tradems_test")
            .WithUsername("test")
            .WithPassword("test")
            .Build()
        : null;

    private Respawner _respawner = null!;
    private NpgsqlConnection _respawnConnection = null!;
    public string ConnectionString => ExternalDb ?? _db!.GetConnectionString();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor is not null)
                services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(opts =>
                opts.UseNpgsql(ConnectionString));
        });

        builder.UseSetting("Jwt:Secret", "test-secret-key-32-chars-minimum!!");
        builder.UseSetting("Jwt:Issuer", "TradeMS.Test");
        builder.UseSetting("Jwt:Audience", "TradeMS.Test");
        // Тесты логинятся сотни раз с одного адреса — лимит /auth здесь не проверяем.
        builder.UseSetting("RateLimit:AuthPerMinute", "100000");
    }

    public async Task InitializeAsync()
    {
        if (_db is not null)
            await _db.StartAsync();

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();

        _respawnConnection = new NpgsqlConnection(ConnectionString);
        await _respawnConnection.OpenAsync();

        _respawner = await Respawner.CreateAsync(_respawnConnection, new RespawnerOptions
        {
            DbAdapter = DbAdapter.Postgres,
            SchemasToInclude = ["public"],
            // История миграций — не данные: без неё повторный прогон на той же БД падает на MigrateAsync.
            TablesToIgnore = ["__EFMigrationsHistory"]
        });
    }

    public async Task ResetDatabaseAsync()
    {
        await _respawner.ResetAsync(_respawnConnection);
    }

    public new async Task DisposeAsync()
    {
        await _respawnConnection.DisposeAsync();
        if (_db is not null)
            await _db.DisposeAsync();
    }
}
