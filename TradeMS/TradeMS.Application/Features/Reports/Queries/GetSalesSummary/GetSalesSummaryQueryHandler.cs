using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Reports.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Reports.Queries.GetSalesSummary;

public class GetSalesSummaryQueryHandler(IAppDbContext db)
    : IRequestHandler<GetSalesSummaryQuery, SalesSummaryDto>
{
    public async Task<SalesSummaryDto> Handle(
        GetSalesSummaryQuery request, CancellationToken cancellationToken)
    {
        var totalDocuments = await db.Documents
            .CountAsync(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Type == DocumentType.Expense &&
                d.Date >= request.DateFrom &&
                d.Date <= request.DateTo &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value),
                cancellationToken);

        var totalRevenue = await db.Documents
            .Where(d =>
                d.CompanyId == request.CompanyId &&
                d.Status == DocumentStatus.Confirmed &&
                d.Type == DocumentType.Expense &&
                d.Date >= request.DateFrom &&
                d.Date <= request.DateTo &&
                (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value))
            .SumAsync(d => d.TotalAmountBase, cancellationToken);

        var rawLines = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                l.Document.Type == DocumentType.Expense &&
                l.Document.Date >= request.DateFrom &&
                l.Document.Date <= request.DateTo &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .Select(l => new
            {
                l.ProductId,
                ProductName = l.Product.Name,
                Sku = l.Product.Sku,
                Unit = l.Product.Unit,
                PriceBuy = l.Product.PriceBuy,
                l.Quantity,
                l.Total,
            })
            .ToListAsync(cancellationToken);

        var lines = rawLines
            .GroupBy(l => new { l.ProductId, l.ProductName, l.Sku, l.Unit, l.PriceBuy })
            .Select(g =>
            {
                var qty = g.Sum(l => l.Quantity);
                var revenue = g.Sum(l => l.Total);
                var cost = qty * g.Key.PriceBuy;
                return new SalesLineDto(
                    g.Key.ProductId,
                    g.Key.ProductName,
                    g.Key.Sku,
                    g.Key.Unit.ToString(),
                    qty,
                    revenue,
                    cost,
                    revenue - cost
                );
            })
            .OrderByDescending(l => l.Revenue)
            .ToList();

        var totalCost = lines.Sum(l => l.Cost);
        var totalProfit = totalRevenue - totalCost;

        return new SalesSummaryDto(
            request.DateFrom, request.DateTo,
            totalRevenue, totalCost, totalProfit,
            totalDocuments, lines);
    }
}
