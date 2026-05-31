using MediatR;
using TradeMS.Application.Features.Reports.DTOs;

namespace TradeMS.Application.Features.Reports.Queries.GetStockBalance;

public record GetStockBalanceQuery(
    Guid CompanyId,
    Guid? BranchId
) : IRequest<StockBalanceDto>;
