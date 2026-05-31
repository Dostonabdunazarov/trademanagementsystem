using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Users.DTOs;

namespace TradeMS.Application.Features.Users.Commands.UpdateUser;

public class UpdateUserCommandHandler(IAppDbContext db)
    : IRequestHandler<UpdateUserCommand, UserDto>
{
    public async Task<UserDto> Handle(
        UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(
                u => u.Id == request.Id && u.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"User {request.Id} not found");

        user.FullName = request.FullName;
        user.Role = request.Role;
        user.IsActive = request.IsActive;

        if (!string.IsNullOrWhiteSpace(request.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        await db.SaveChangesAsync(cancellationToken);

        return new UserDto(
            user.Id,
            user.CompanyId,
            user.BranchId,
            user.FullName,
            user.Email,
            user.Role.ToString(),
            user.IsActive,
            user.CreatedAt
        );
    }
}
