using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Branches.DTOs;

namespace TradeMS.Application.Features.Branches.Queries.GetBranches;

public class GetBranchesQueryHandler(IAppDbContext db)
    : IRequestHandler<GetBranchesQuery, List<BranchDto>>
{
    public async Task<List<BranchDto>> Handle(
        GetBranchesQuery request, CancellationToken cancellationToken)
    {
        return await db.Branches
            .Where(b => b.CompanyId == request.CompanyId)
            .OrderBy(b => b.Name)
            .Select(b => new BranchDto(b.Id, b.CompanyId, b.Name, b.Address))
            .ToListAsync(cancellationToken);
    }
}
