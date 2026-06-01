using FluentValidation;
using Microsoft.EntityFrameworkCore;
using TradeMS.Api.Endpoints;
using TradeMS.Api.Infrastructure;
using TradeMS.Application;
using TradeMS.Infrastructure;
using TradeMS.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

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
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var adminEmail = builder.Configuration["Seed:AdminEmail"] ?? "admin@tradems.com";
    var adminPassword = builder.Configuration["Seed:AdminPassword"]
        ?? throw new InvalidOperationException("Seed:AdminPassword is not configured.");

    if (!db.Users.Any(u => u.Email == adminEmail))
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

app.UseExceptionHandler();
app.UseCors();
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
    .MapUserEndpoints();

app.Run();

public partial class Program { }
