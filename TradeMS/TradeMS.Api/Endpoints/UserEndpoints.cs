using System.Security.Claims;
using MediatR;
using TradeMS.Api.Infrastructure;
using TradeMS.Application.Features.Users.Commands.CreateUser;
using TradeMS.Application.Features.Users.Commands.DeleteUser;
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
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Get all users for the company (Admin only)");

        group.MapPost("/", async (CreateUserRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);

            if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
                return Results.BadRequest($"Invalid role '{req.Role}'. Use Admin, Manager or Cashier.");

            var result = await mediator.Send(
                new CreateUserCommand(companyId, req.FullName, req.Email, req.Password, role, req.BranchId));
            return Results.Created($"/users/{result.Id}", result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Create a new user");

        group.MapPut("/{id:guid}", async (Guid id, UpdateUserRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);

            if (!Enum.TryParse<UserRole>(req.Role, true, out var role))
                return Results.BadRequest($"Invalid role '{req.Role}'. Use Admin, Manager or Cashier.");

            var result = await mediator.Send(
                new UpdateUserCommand(id, companyId, user.GetUserId(), req.FullName, role, req.Password, req.IsActive, req.BranchId));
            return Results.Ok(result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Update user");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            await mediator.Send(new DeleteUserCommand(id, companyId, user.GetUserId()));
            return Results.NoContent();
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Delete user (soft delete)");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
