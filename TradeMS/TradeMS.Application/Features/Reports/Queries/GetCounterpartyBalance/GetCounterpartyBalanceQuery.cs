using MediatR;
using TradeMS.Application.Features.Reports.DTOs;

namespace TradeMS.Application.Features.Reports.Queries.GetCounterpartyBalance;

public record GetCounterpartyBalanceQuery(
    Guid CompanyId,
    string? Type
) : IRequest<CounterpartyBalanceDto>;
