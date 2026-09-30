using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Users.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Users.Commands.UpdateUser;

public class UpdateUserCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<UpdateUserCommand, UserDto>
{
    public async Task<UserDto> Handle(
        UpdateUserCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(
                u => u.Id == request.Id && u.CompanyId == request.CompanyId && u.DeletedAt == null,
                cancellationToken)
            ?? throw new KeyNotFoundException($"User {request.Id} not found");

        // Филиал не передан: Manager/Cashier сохраняют текущий (они обязаны быть в филиале),
        // у Admin это означает «без филиала».
        var branchId = request.BranchId ?? (request.Role == UserRole.Admin ? null : user.BranchId);

        var roleChanged = user.Role != request.Role;
        var activeChanged = user.IsActive != request.IsActive;
        var branchChanged = user.BranchId != branchId;
        var passwordChanged = !string.IsNullOrWhiteSpace(request.Password);

        if (request.Id == request.ActorId && (roleChanged || activeChanged))
            throw new BusinessException(ErrorCodes.CannotModifySelf,
                "You cannot change your own role or active status");

        var losesAdmin = user.Role == UserRole.Admin && user.IsActive &&
                         (request.Role != UserRole.Admin || !request.IsActive);
        if (losesAdmin)
            await UserRules.EnsureAnotherActiveAdminAsync(db, user, cancellationToken);

        await UserRules.EnsureBranchAsync(db, request.CompanyId, request.Role, branchId, cancellationToken);

        user.FullName = request.FullName;
        user.Role = request.Role;
        user.IsActive = request.IsActive;
        user.BranchId = branchId;

        if (passwordChanged)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        // Роль и филиал зашиты в токен — после их смены (или смены пароля) старую сессию
        // продолжать нельзя. Access-токен короткий, refresh отзываем.
        if (roleChanged || activeChanged || branchChanged || passwordChanged)
            UserRules.RevokeSessions(user);

        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.UserUpdate,
            entityType: "User", entityId: user.Id.ToString(),
            details: JsonSerializer.Serialize(new
            {
                isActive = user.IsActive,
                role = user.Role.ToString(),
                branchId = user.BranchId,
                passwordChanged
            }),
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
