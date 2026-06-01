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

        var snapshot = JsonSerializer.Serialize(new { name = branch.Name });

        db.Branches.Remove(branch);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.BranchDelete,
            entityType: "Branch", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
