using MediatR;
using TradeMS.Application.Features.Branches.DTOs;

namespace TradeMS.Application.Features.Branches.Queries.GetBranches;

public record GetBranchesQuery(Guid CompanyId) : IRequest<List<BranchDto>>;
