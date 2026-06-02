using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

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

        var snapshot = JsonSerializer.Serialize(new { email = user.Email, fullName = user.FullName });

        user.DeletedAt = DateTime.UtcNow;
        user.IsActive = false;
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.UserDelete,
            entityType: "User", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
