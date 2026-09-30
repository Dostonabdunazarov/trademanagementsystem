using System.Net;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using TradeMS.Api.Endpoints;
using TradeMS.Api.Infrastructure;
using TradeMS.Application;
using TradeMS.Infrastructure;
using TradeMS.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls($"http://+:{Environment.GetEnvironmentVariable("PORT") ?? "8080"}");

var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
if (!string.IsNullOrEmpty(databaseUrl))
{
    var uri = new Uri(databaseUrl);
    var userInfo = uri.UserInfo.Split(':');
    var npgsqlConn = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};Username={userInfo[0]};Password={userInfo[1]}";
    builder.Configuration["ConnectionStrings:DefaultConnection"] = npgsqlConn;
}

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddOpenApi();
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    o.SerializerOptions.Converters.Add(new DateOnlyJsonConverter());
});
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

// Реальный IP клиента: запрос идёт Caddy → nginx (tradems-ui) → API, оба прокси в docker-сетях.
// Доверяем только частным сетям и разбираем ровно два прокси-хопа, поэтому поддельный
// X-Forwarded-For от клиента не может подменить адрес (нужен для rate limiting и аудита).
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.ForwardLimit = 2;
    o.KnownProxies.Clear();
    o.KnownNetworks.Clear();
    o.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("10.0.0.0"), 8));
    o.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("172.16.0.0"), 12));
    o.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Parse("192.168.0.0"), 16));
    o.KnownNetworks.Add(new Microsoft.AspNetCore.HttpOverrides.IPNetwork(IPAddress.Loopback, 8));
});

// Ограничение перебора паролей и refresh-токенов: окно на IP.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("auth", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = builder.Configuration.GetValue("RateLimit:AuthPerMinute", 20),
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
        }));
});
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (allowedOrigins.Length > 0)
            policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
        else if (builder.Environment.IsDevelopment())
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        // else: no origins configured in non-dev → CORS denies cross-origin by default
    });
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    // docker compose подставляет пустую строку для незаданной переменной, поэтому
    // проверяем IsNullOrWhiteSpace, а не только null.
    var adminEmail = builder.Configuration["Seed:AdminEmail"];
    if (string.IsNullOrWhiteSpace(adminEmail))
        adminEmail = "admin@tradems.com";
    adminEmail = adminEmail.Trim().ToLowerInvariant();

    var adminPassword = builder.Configuration["Seed:AdminPassword"];
    if (string.IsNullOrWhiteSpace(adminPassword) || adminPassword.Length < 8)
        throw new InvalidOperationException("Seed:AdminPassword is not configured or is shorter than 8 characters.");

    if (!db.Users.Any(u => u.Email.ToLower() == adminEmail))
    {
        var companyId = Guid.NewGuid();
        db.Companies.Add(new TradeMS.Domain.Entities.Company
        {
            Id = companyId,
            Name = "TradeMS",
            CreatedAt = DateTime.UtcNow
        });
        db.Users.Add(new TradeMS.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            CompanyId = companyId,
            FullName = "Admin",
            Email = adminEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
            Role = TradeMS.Domain.Enums.UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();
    }
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseForwardedHeaders();
app.UseCors();
app.UseExceptionHandler();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");

app.MapGroup("/api")
    .MapAuthEndpoints()
    .MapBranchEndpoints()
    .MapProductGroupEndpoints()
    .MapProductEndpoints()
    .MapCounterpartyEndpoints()
    .MapCurrencyEndpoints()
    .MapDocumentEndpoints()
    .MapReportEndpoints()
    .MapAccountEndpoints()
    .MapUserEndpoints()
    .MapAuditLogEndpoints();

app.Run();

public partial class Program { }
