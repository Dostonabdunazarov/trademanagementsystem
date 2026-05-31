using MediatR;
using TradeMS.Application.Features.Branches.DTOs;

namespace TradeMS.Application.Features.Branches.Commands.CreateBranch;

public record CreateBranchCommand(
    Guid CompanyId,
    string Name,
    string? Address
) : IRequest<BranchDto>;
