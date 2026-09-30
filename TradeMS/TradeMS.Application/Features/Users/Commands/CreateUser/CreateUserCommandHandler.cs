using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Users.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Users.Commands.CreateUser;

public class CreateUserCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<CreateUserCommand, UserDto>
{
    public async Task<UserDto> Handle(
        CreateUserCommand request, CancellationToken cancellationToken)
    {
        var email = UserRules.NormalizeEmail(request.Email);
        var emailExists = await db.Users
            .AnyAsync(u => u.Email.ToLower() == email, cancellationToken);
        if (emailExists)
            throw new BusinessException(ErrorCodes.EmailInUse, $"Email '{email}' is already in use",
                new Dictionary<string, object?> { ["email"] = email });

        await UserRules.EnsureBranchAsync(db, request.CompanyId, request.Role, request.BranchId, cancellationToken);

        var user = new User
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            BranchId = request.BranchId,
            FullName = request.FullName,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role = request.Role,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.UserCreate,
            entityType: "User", entityId: user.Id.ToString(),
            details: JsonSerializer.Serialize(new { email = user.Email, role = user.Role.ToString() }),
            cancellationToken: cancellationToken);

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
