using MediatR;

namespace TradeMS.Application.Features.Auth.Commands.Logout;

public record LogoutCommand(Guid UserId) : IRequest;
