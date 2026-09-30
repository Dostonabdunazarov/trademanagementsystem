using MediatR;
using TradeMS.Application.Features.Users.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Users.Commands.UpdateUser;

/// <param name="ActorId">Кто выполняет изменение — нельзя менять собственные роль и активность.</param>
public record UpdateUserCommand(
    Guid Id,
    Guid CompanyId,
    Guid ActorId,
    string FullName,
    UserRole Role,
    string? Password,
    bool IsActive,
    Guid? BranchId
) : IRequest<UserDto>;
