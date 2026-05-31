using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Reports.DTOs;

namespace TradeMS.Application.Features.Reports.Queries.GetStockBalance;

public class GetStockBalanceQueryHandler(IAppDbContext db)
    : IRequestHandler<GetStockBalanceQuery, StockBalanceDto>
{
    public async Task<StockBalanceDto> Handle(
        GetStockBalanceQuery request, CancellationToken cancellationToken)
    {
        var query = db.Stocks
            .Where(s => s.Product.CompanyId == request.CompanyId && s.Quantity > 0);

        if (request.BranchId.HasValue)
            query = query.Where(s => s.BranchId == request.BranchId.Value);

        var raw = await query
            .OrderBy(s => s.Product.Name)
            .ThenBy(s => s.Branch.Name)
            .Select(s => new
            {
                s.ProductId,
                ProductName = s.Product.Name,
                s.Product.Sku,
                Unit = s.Product.Unit,
                GroupName = s.Product.Group != null ? s.Product.Group.Name : null,
                s.BranchId,
                BranchName = s.Branch.Name,
                s.Quantity,
                s.Product.PriceSell,
                s.Product.PriceBuy,
            })
            .ToListAsync(cancellationToken);

        var lines = raw.Select(s => new StockBalanceLineDto(
            s.ProductId,
            s.ProductName,
            s.Sku,
            s.Unit.ToString(),
            s.GroupName ?? "Без группы",
            s.BranchId,
            s.BranchName,
            s.Quantity,
            s.PriceSell,
            s.PriceBuy,
            s.Quantity * s.PriceSell,
            s.Quantity * s.PriceBuy
        )).ToList();

        var totalSellValue = lines.Sum(l => l.TotalSellValue);
        var totalBuyValue = lines.Sum(l => l.TotalBuyValue);

        return new StockBalanceDto(totalSellValue, totalBuyValue, lines);
    }
}
