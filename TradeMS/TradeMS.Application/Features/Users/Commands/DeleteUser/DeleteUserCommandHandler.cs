using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Users.Commands.DeleteUser;

public class DeleteUserCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<DeleteUserCommand>
{
    public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(
                u => u.Id == request.Id && u.CompanyId == request.CompanyId && u.DeletedAt == null,
                cancellationToken)
            ?? throw new KeyNotFoundException($"User {request.Id} not found");

        if (user.Id == request.ActorId)
            throw new BusinessException(ErrorCodes.CannotModifySelf, "You cannot delete yourself");

        if (user.Role == UserRole.Admin && user.IsActive)
            await UserRules.EnsureAnotherActiveAdminAsync(db, user, cancellationToken);

        var snapshot = JsonSerializer.Serialize(new { email = user.Email, fullName = user.FullName });

        user.DeletedAt = DateTime.UtcNow;
        user.IsActive = false;
        UserRules.RevokeSessions(user);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.UserDelete,
            entityType: "User", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
