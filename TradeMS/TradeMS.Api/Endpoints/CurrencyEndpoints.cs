using MediatR;
using TradeMS.Application.Features.Currencies.Commands.CreateCurrency;
using TradeMS.Application.Features.Currencies.Commands.CreateExchangeRate;
using TradeMS.Application.Features.Currencies.DTOs;
using TradeMS.Application.Features.Currencies.Queries.GetCurrencies;
using TradeMS.Application.Features.Currencies.Queries.GetExchangeRates;

namespace TradeMS.Api.Endpoints;

public static class CurrencyEndpoints
{
    public static IEndpointRouteBuilder MapCurrencyEndpoints(this IEndpointRouteBuilder app)
    {
        // ── Currencies ────────────────────────────────────────────────────────
        var currencies = app.MapGroup("/currencies")
            .WithTags("Currencies")
            .RequireAuthorization();

        currencies.MapGet("/", async (IMediator mediator) =>
        {
            var result = await mediator.Send(new GetCurrenciesQuery());
            return Results.Ok(result);
        })
        .WithSummary("Get all currencies (base first)");

        currencies.MapPost("/", async (CreateCurrencyRequest req, IMediator mediator) =>
        {
            var result = await mediator.Send(
                new CreateCurrencyCommand(req.Code, req.Name, req.IsBase));
            return Results.Created($"/currencies/{result.Id}", result);
        })
        .WithSummary("Create currency (setting IsBase=true demotes other base currencies)");

        // ── Exchange Rates ────────────────────────────────────────────────────
        var rates = app.MapGroup("/exchange-rates")
            .WithTags("ExchangeRates")
            .RequireAuthorization();

        rates.MapGet("/", async (DateOnly? date, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetExchangeRatesQuery(date));
            return Results.Ok(result);
        })
        .WithSummary("Get exchange rates. Without ?date= returns latest rate per pair");

        rates.MapPost("/", async (CreateExchangeRateRequest req, IMediator mediator) =>
        {
            var result = await mediator.Send(new CreateExchangeRateCommand(
                req.FromCurrencyId, req.ToCurrencyId, req.Rate, req.Date));
            return Results.Created($"/exchange-rates/{result.Id}", result);
        })
        .WithSummary("Create or update exchange rate for a currency pair on a given date");

        return app;
    }
}
