using System.Security.Claims;
using MediatR;
using TradeMS.Application.Features.Branches.Commands.CreateBranch;
using TradeMS.Application.Features.Branches.Commands.DeleteBranch;
using TradeMS.Application.Features.Branches.Queries.GetBranches;

namespace TradeMS.Api.Endpoints;

public static class BranchEndpoints
{
    public static IEndpointRouteBuilder MapBranchEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/branches")
            .WithTags("Branches")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetBranchesQuery(companyId));
            return Results.Ok(result);
        })
        .WithSummary("Get all branches for current company");

        group.MapPost("/", async (CreateBranchRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new CreateBranchCommand(companyId, req.Name, req.Address));
            return Results.Created($"/branches/{result.Id}", result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Create a new branch");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            await mediator.Send(new DeleteBranchCommand(id, companyId));
            return Results.NoContent();
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Delete branch by id");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}

public record CreateBranchRequest(string Name, string? Address);
