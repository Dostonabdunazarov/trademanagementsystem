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
}

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseExceptionHandler();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

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
