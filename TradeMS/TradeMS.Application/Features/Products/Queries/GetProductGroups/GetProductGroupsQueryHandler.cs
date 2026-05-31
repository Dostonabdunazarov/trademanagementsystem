using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Products.DTOs;

namespace TradeMS.Application.Features.Products.Queries.GetProductGroups;

public class GetProductGroupsQueryHandler(IAppDbContext db)
    : IRequestHandler<GetProductGroupsQuery, List<ProductGroupDto>>
{
    public async Task<List<ProductGroupDto>> Handle(GetProductGroupsQuery request, CancellationToken cancellationToken)
    {
        var groups = await db.ProductGroups
            .Where(g => g.CompanyId == request.CompanyId)
            .ToListAsync(cancellationToken);

        return BuildTree(groups, null);
    }

    private static List<ProductGroupDto> BuildTree(
        List<Domain.Entities.ProductGroup> all, Guid? parentId)
    {
        return all
            .Where(g => g.ParentId == parentId)
            .Select(g => new ProductGroupDto(g.Id, g.Name, g.ParentId, BuildTree(all, g.Id)))
            .ToList();
    }
}
