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

        // Index children by parent once (O(n)) instead of re-scanning the full list at every node.
        var byParent = groups.ToLookup(g => g.ParentId);
        return BuildTree(byParent, null);
    }

    private static List<ProductGroupDto> BuildTree(
        ILookup<Guid?, Domain.Entities.ProductGroup> byParent, Guid? parentId)
    {
        return byParent[parentId]
            .Select(g => new ProductGroupDto(g.Id, g.Name, g.ParentId, BuildTree(byParent, g.Id)))
            .ToList();
    }
}
