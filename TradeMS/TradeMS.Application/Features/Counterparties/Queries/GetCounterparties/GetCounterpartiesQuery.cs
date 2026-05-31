using MediatR;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Counterparties.Queries.GetCounterparties;

public record GetCounterpartiesQuery(
    Guid CompanyId,
    CounterpartyType? Type,
    string? Search,
    int Page,
    int PageSize
) : IRequest<PagedResult<CounterpartyDto>>;
