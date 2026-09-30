using System.Security.Claims;
using MediatR;
using TradeMS.Api.Infrastructure;
using TradeMS.Application.Features.Auth.Commands.Login;
using TradeMS.Application.Features.Auth.Commands.Logout;
using TradeMS.Application.Features.Auth.Commands.RefreshToken;
using TradeMS.Application.Features.Auth.DTOs;

namespace TradeMS.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth").RequireRateLimiting("auth");

        group.MapPost("/login", async (LoginRequest req, IMediator mediator) =>
        {
            var result = await mediator.Send(new LoginCommand(req.Email, req.Password));
            return Results.Ok(result);
        })
        .AllowAnonymous()
        .WithSummary("Login with email and password");

        group.MapPost("/refresh", async (RefreshTokenRequest req, IMediator mediator) =>
        {
            var result = await mediator.Send(new RefreshTokenCommand(req.RefreshToken));
            return Results.Ok(result);
        })
        .AllowAnonymous()
        .WithSummary("Refresh access token");

        group.MapPost("/logout", async (ClaimsPrincipal user, IMediator mediator) =>
        {
            await mediator.Send(new LogoutCommand(user.GetUserId()));
            return Results.NoContent();
        })
        .RequireAuthorization()
        .WithSummary("Log out (revokes the refresh token)");

        return app;
    }
}
