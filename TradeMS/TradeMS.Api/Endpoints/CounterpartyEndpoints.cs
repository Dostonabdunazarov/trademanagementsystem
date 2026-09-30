using System.Security.Claims;
using MediatR;
using TradeMS.Api.Infrastructure;
using TradeMS.Application.Features.Counterparties.Commands.CreateCounterparty;
using TradeMS.Application.Features.Counterparties.Commands.DeleteCounterparty;
using TradeMS.Application.Features.Counterparties.Commands.UpdateCounterparty;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Application.Features.Counterparties.Queries.GetCounterparties;
using TradeMS.Domain.Enums;

namespace TradeMS.Api.Endpoints;

public static class CounterpartyEndpoints
{
    public static IEndpointRouteBuilder MapCounterpartyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/counterparties")
            .WithTags("Counterparties")
            .RequireAuthorization();

        group.MapGet("/", async (
            ClaimsPrincipal user,
            IMediator mediator,
            string? type,
            string? search,
            int page = 1,
            int pageSize = 20) =>
        {
            var companyId = GetCompanyId(user);
            CounterpartyType? counterpartyType = null;
            if (!string.IsNullOrWhiteSpace(type) && Enum.TryParse<CounterpartyType>(type, true, out var parsed))
                counterpartyType = parsed;

            var result = await mediator.Send(
                new GetCounterpartiesQuery(companyId, counterpartyType, search, ClaimsPrincipalExtensions.ClampPage(page), ClaimsPrincipalExtensions.ClampPageSize(pageSize)));
            return Results.Ok(result);
        })
        .WithSummary("Get counterparties list (paginated, filterable by type)");

        group.MapPost("/", async (CreateCounterpartyRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new CreateCounterpartyCommand(
                companyId, req.Type, req.Name, req.Phone, req.Address, req.CreditLimit));
            return Results.Created($"/counterparties/{result.Id}", result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Create counterparty");

        group.MapPut("/{id:guid}", async (Guid id, UpdateCounterpartyRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new UpdateCounterpartyCommand(
                id, companyId, req.Type, req.Name, req.Phone, req.Address, req.CreditLimit));
            return Results.Ok(result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Update counterparty");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            await mediator.Send(new DeleteCounterpartyCommand(id, companyId));
            return Results.NoContent();
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Delete counterparty");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
