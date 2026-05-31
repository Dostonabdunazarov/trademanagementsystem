using MediatR;
using TradeMS.Application.Features.Users.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Users.Commands.UpdateUser;

public record UpdateUserCommand(
    Guid Id,
    Guid CompanyId,
    string FullName,
    UserRole Role,
    string? Password,
    bool IsActive
) : IRequest<UserDto>;
