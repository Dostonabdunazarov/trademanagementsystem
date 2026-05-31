using MediatR;
using TradeMS.Application.Features.Users.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Users.Commands.CreateUser;

public record CreateUserCommand(
    Guid CompanyId,
    string FullName,
    string Email,
    string Password,
    UserRole Role,
    Guid? BranchId
) : IRequest<UserDto>;
