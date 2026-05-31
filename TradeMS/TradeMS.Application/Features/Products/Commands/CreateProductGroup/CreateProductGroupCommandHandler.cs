using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Products.Commands.CreateProductGroup;

public class CreateProductGroupCommandHandler(IAppDbContext db)
    : IRequestHandler<CreateProductGroupCommand, ProductGroupDto>
{
    public async Task<ProductGroupDto> Handle(CreateProductGroupCommand request, CancellationToken cancellationToken)
    {
        if (request.ParentId.HasValue)
        {
            var parent = await db.ProductGroups
                .FirstOrDefaultAsync(g => g.Id == request.ParentId && g.CompanyId == request.CompanyId, cancellationToken)
                ?? throw new KeyNotFoundException("Parent group not found");
        }

        var group = new ProductGroup
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Name = request.Name,
            ParentId = request.ParentId
        };

        db.ProductGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);

        return new ProductGroupDto(group.Id, group.Name, group.ParentId, []);
    }
}
