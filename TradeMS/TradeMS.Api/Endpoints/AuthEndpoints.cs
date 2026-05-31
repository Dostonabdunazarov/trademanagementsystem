using MediatR;
using TradeMS.Application.Features.Auth.Commands.Login;
using TradeMS.Application.Features.Auth.Commands.RefreshToken;
using TradeMS.Application.Features.Auth.DTOs;

namespace TradeMS.Api.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("Auth");

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

        return app;
    }
}
