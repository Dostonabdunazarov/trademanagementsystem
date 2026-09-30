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
        var documents = db.Documents.Where(d =>
            d.CompanyId == request.CompanyId &&
            d.Status == DocumentStatus.Confirmed &&
            d.Type == DocumentType.Expense &&
            d.Date >= request.DateFrom &&
            d.Date <= request.DateTo &&
            (!request.BranchId.HasValue || d.BranchId == request.BranchId.Value));

        var totalDocuments = await documents.CountAsync(cancellationToken);
        var totalRevenue = await documents.SumAsync(d => d.TotalAmountBase, cancellationToken);

        // Построчно — выручка в базовой валюте с учётом скидки документа (TotalBase) и
        // себестоимость на момент проведения (CostBase). Сумма строк равна итогам документа,
        // поэтому прибыль по строкам сходится с TotalProfit.
        var lines = await db.DocumentLines
            .Where(l =>
                l.Document.CompanyId == request.CompanyId &&
                l.Document.Status == DocumentStatus.Confirmed &&
                l.Document.Type == DocumentType.Expense &&
                l.Document.Date >= request.DateFrom &&
                l.Document.Date <= request.DateTo &&
                (!request.BranchId.HasValue || l.Document.BranchId == request.BranchId.Value))
            .GroupBy(l => new { l.ProductId, l.Product.Name, l.Product.Sku, l.Product.Unit })
            .Select(g => new
            {
                g.Key.ProductId,
                g.Key.Name,
                g.Key.Sku,
                g.Key.Unit,
                Quantity = g.Sum(l => l.Quantity),
                Revenue = g.Sum(l => l.TotalBase),
                Cost = g.Sum(l => l.CostBase),
            })
            .ToListAsync(cancellationToken);

        var lineDtos = lines
            .Select(l => new SalesLineDto(
                l.ProductId,
                l.Name,
                l.Sku,
                l.Unit.ToString(),
                l.Quantity,
                l.Revenue,
                l.Cost,
                l.Revenue - l.Cost))
            .OrderByDescending(l => l.Revenue)
            .ToList();

        var totalCost = lineDtos.Sum(l => l.Cost);
        var totalProfit = totalRevenue - totalCost;

        return new SalesSummaryDto(
            request.DateFrom, request.DateTo,
            totalRevenue, totalCost, totalProfit,
            totalDocuments, lineDtos);
    }
}
