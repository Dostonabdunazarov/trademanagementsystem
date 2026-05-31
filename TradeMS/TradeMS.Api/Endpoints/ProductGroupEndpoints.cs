using System.Security.Claims;
using MediatR;
using TradeMS.Application.Features.Products.Commands.CreateProductGroup;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Application.Features.Products.Queries.GetProductGroups;

namespace TradeMS.Api.Endpoints;

public static class ProductGroupEndpoints
{
    public static IEndpointRouteBuilder MapProductGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/product-groups")
            .WithTags("ProductGroups")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetProductGroupsQuery(companyId));
            return Results.Ok(result);
        })
        .WithSummary("Get product groups tree");

        group.MapPost("/", async (CreateProductGroupRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new CreateProductGroupCommand(companyId, req.Name, req.ParentId));
            return Results.Created($"/product-groups/{result.Id}", result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Create product group");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
