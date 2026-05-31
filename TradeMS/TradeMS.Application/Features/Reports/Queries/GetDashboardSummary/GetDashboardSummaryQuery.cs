using MediatR;
using TradeMS.Application.Features.Reports.DTOs;

namespace TradeMS.Application.Features.Reports.Queries.GetDashboardSummary;

public record GetDashboardSummaryQuery(Guid CompanyId, Guid? BranchId = null) : IRequest<DashboardSummaryDto>;
