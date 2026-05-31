using MediatR;
using TradeMS.Application.Features.Reports.DTOs;

namespace TradeMS.Application.Features.Reports.Queries.GetSalesSummary;

public record GetSalesSummaryQuery(
    Guid CompanyId,
    DateOnly DateFrom,
    DateOnly DateTo,
    Guid? BranchId = null
) : IRequest<SalesSummaryDto>;
