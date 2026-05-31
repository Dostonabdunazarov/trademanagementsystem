using MediatR;
using TradeMS.Application.Features.Users.DTOs;

namespace TradeMS.Application.Features.Users.Queries.GetUsers;

public record GetUsersQuery(Guid CompanyId) : IRequest<List<UserDto>>;
