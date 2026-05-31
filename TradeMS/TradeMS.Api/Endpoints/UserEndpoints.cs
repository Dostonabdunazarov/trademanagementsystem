using System.Security.Claims;
using MediatR;
using TradeMS.Application.Features.Users.Commands.CreateUser;
using TradeMS.Application.Features.Users.Commands.UpdateUser;
using TradeMS.Application.Features.Users.DTOs;
using TradeMS.Application.Features.Users.Queries.GetUsers;
using TradeMS.Domain.Enums;

namespace TradeMS.Api.Endpoints;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapGet("/", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetUsersQuery(companyId));
            return Results.Ok(result);
        })
        .WithSummary("Get all users for the company");

        group.MapPost("/", async (CreateUserRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);

            if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
                return Results.BadRequest($"Invalid role '{req.Role}'. Use Admin, Manager or Cashier.");

            var result = await mediator.Send(
                new CreateUserCommand(companyId, req.FullName, req.Email, req.Password, role, req.BranchId));
            return Results.Created($"/users/{result.Id}", result);
        })
        .WithSummary("Create a new user");

        group.MapPut("/{id:guid}", async (Guid id, UpdateUserRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);

            if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
                return Results.BadRequest($"Invalid role '{req.Role}'. Use Admin, Manager or Cashier.");

            var result = await mediator.Send(
                new UpdateUserCommand(id, companyId, req.FullName, role, req.Password, req.IsActive));
            return Results.Ok(result);
        })
        .WithSummary("Update user");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
