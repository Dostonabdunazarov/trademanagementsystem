using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Branches.Commands.DeleteBranch;

public class DeleteBranchCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<DeleteBranchCommand>
{
    public async Task Handle(DeleteBranchCommand request, CancellationToken cancellationToken)
    {
        var branch = await db.Branches
            .FirstOrDefaultAsync(
                b => b.Id == request.Id && b.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Branch {request.Id} not found");

        // Guard against cascade data-loss: a branch with documents/accounts/users/stock must not be
        // hard-deleted, otherwise those dependent records would be cascaded away.
        if (await db.Documents.AnyAsync(d => d.BranchId == request.Id, cancellationToken))
            throw new InvalidOperationException("Cannot delete a branch that has documents.");
        if (await db.Accounts.AnyAsync(a => a.BranchId == request.Id, cancellationToken))
            throw new InvalidOperationException("Cannot delete a branch that has accounts.");
        if (await db.Users.AnyAsync(u => u.BranchId == request.Id, cancellationToken))
            throw new InvalidOperationException("Cannot delete a branch that has users.");
        if (await db.Stocks.AnyAsync(s => s.BranchId == request.Id && s.Quantity != 0, cancellationToken))
            throw new InvalidOperationException("Cannot delete a branch that still has stock.");

        var snapshot = JsonSerializer.Serialize(new { name = branch.Name });

        db.Branches.Remove(branch);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.BranchDelete,
            entityType: "Branch", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
