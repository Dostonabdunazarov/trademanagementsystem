using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Accounts.Commands.DeleteAccount;

public class DeleteAccountCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<DeleteAccountCommand>
{
    public async Task Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        var account = await db.Accounts
            .FirstOrDefaultAsync(
                a => a.Id == request.Id && a.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Account {request.Id} not found");

        // Guard against cascade data-loss: an account referenced by payments or documents must not
        // be hard-deleted, otherwise the financial records pointing at it would be cascaded away.
        if (await db.Payments.AnyAsync(p => p.AccountId == request.Id, cancellationToken))
            throw new InvalidOperationException("Cannot delete an account that has payments.");
        if (await db.Documents.AnyAsync(d => d.AccountId == request.Id, cancellationToken))
            throw new InvalidOperationException("Cannot delete an account that is used in documents.");

        var snapshot = JsonSerializer.Serialize(new { name = account.Name });

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.AccountDelete,
            entityType: "Account", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
