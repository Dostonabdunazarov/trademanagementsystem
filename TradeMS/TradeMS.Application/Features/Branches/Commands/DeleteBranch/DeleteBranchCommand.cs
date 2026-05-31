using MediatR;

namespace TradeMS.Application.Features.Branches.Commands.DeleteBranch;

public record DeleteBranchCommand(Guid Id, Guid CompanyId) : IRequest;
