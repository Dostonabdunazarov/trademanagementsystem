using System.Security.Claims;
using MediatR;
using TradeMS.Application.Features.Accounts.Commands.CreateAccount;
using TradeMS.Application.Features.Accounts.Commands.DeleteAccount;
using TradeMS.Application.Features.Accounts.DTOs;
using TradeMS.Application.Features.Accounts.Queries.GetAccounts;
using TradeMS.Domain.Enums;

namespace TradeMS.Api.Endpoints;

public static class AccountEndpoints
{
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/accounts")
            .WithTags("Accounts")
            .RequireAuthorization();

        group.MapGet("/", async (Guid? branchId, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetAccountsQuery(companyId, branchId));
            return Results.Ok(result);
        })
        .WithSummary("Get all accounts (cash registers and bank accounts) for the company");

        group.MapPost("/", async (CreateAccountRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var role = user.FindFirstValue(ClaimTypes.Role);
            var tokenBranchId = GetBranchId(user);

            // Admins aren't necessarily pinned to a branch, so they pick the target branch in the
            // UI and send it in the body. We fall back to the token branch when it's present
            // (keeps existing single-branch admins working). Non-admins always use their token.
            Guid branchId;
            if (role == "Admin")
            {
                branchId = req.BranchId is { } b && b != Guid.Empty ? b : tokenBranchId;
                if (branchId == Guid.Empty)
                    return Results.BadRequest("BranchId is required for Admin");
            }
            else
            {
                branchId = tokenBranchId;
                if (branchId == Guid.Empty)
                    return Results.BadRequest("User is not assigned to a branch");
            }

            if (!Enum.TryParse<AccountType>(req.Type, true, out var accountType))
                return Results.BadRequest($"Invalid account type '{req.Type}'. Use Cash or Bank.");

            var result = await mediator.Send(
                new CreateAccountCommand(companyId, branchId, req.Name, accountType, req.CurrencyId));
            return Results.Created($"/accounts/{result.Id}", result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Create a cash register or bank account");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            await mediator.Send(new DeleteAccountCommand(id, companyId));
            return Results.NoContent();
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Delete account by id");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }

    private static Guid GetBranchId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("branch_id");
        return Guid.TryParse(value, out var id) ? id : Guid.Empty;
    }
}
