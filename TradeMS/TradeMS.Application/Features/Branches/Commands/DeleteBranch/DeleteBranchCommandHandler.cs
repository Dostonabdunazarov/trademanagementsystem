using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;

namespace TradeMS.Application.Features.Branches.Commands.DeleteBranch;

public class DeleteBranchCommandHandler(IAppDbContext db)
    : IRequestHandler<DeleteBranchCommand>
{
    public async Task Handle(DeleteBranchCommand request, CancellationToken cancellationToken)
    {
        var branch = await db.Branches
            .FirstOrDefaultAsync(
                b => b.Id == request.Id && b.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Branch {request.Id} not found");

        db.Branches.Remove(branch);
        await db.SaveChangesAsync(cancellationToken);
    }
}
