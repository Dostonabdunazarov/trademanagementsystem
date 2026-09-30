using MediatR;

namespace TradeMS.Application.Features.Users.Commands.DeleteUser;

public record DeleteUserCommand(Guid Id, Guid CompanyId, Guid ActorId) : IRequest;
