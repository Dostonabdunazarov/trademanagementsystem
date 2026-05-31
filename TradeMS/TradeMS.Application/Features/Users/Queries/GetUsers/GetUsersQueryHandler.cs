using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Users.DTOs;

namespace TradeMS.Application.Features.Users.Queries.GetUsers;

public class GetUsersQueryHandler(IAppDbContext db)
    : IRequestHandler<GetUsersQuery, List<UserDto>>
{
    public async Task<List<UserDto>> Handle(
        GetUsersQuery request, CancellationToken cancellationToken)
    {
        return await db.Users
            .Where(u => u.CompanyId == request.CompanyId)
            .OrderBy(u => u.FullName)
            .Select(u => new UserDto(
                u.Id,
                u.CompanyId,
                u.BranchId,
                u.FullName,
                u.Email,
                u.Role.ToString(),
                u.IsActive,
                u.CreatedAt
            ))
            .ToListAsync(cancellationToken);
    }
}
