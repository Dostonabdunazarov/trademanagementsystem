using MediatR;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Branches.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Branches.Commands.CreateBranch;

public class CreateBranchCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<CreateBranchCommand, BranchDto>
{
    public async Task<BranchDto> Handle(
        CreateBranchCommand request, CancellationToken cancellationToken)
    {
        var branch = new Branch
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Name = request.Name,
            Address = request.Address,
        };

        db.Branches.Add(branch);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.BranchCreate,
            entityType: "Branch", entityId: branch.Id.ToString(),
            cancellationToken: cancellationToken);

        return new BranchDto(branch.Id, branch.CompanyId, branch.Name, branch.Address);
    }
}
