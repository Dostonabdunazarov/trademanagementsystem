namespace TradeMS.Application.Features.Reports.DTOs;

public record SalesSummaryDto(
    DateOnly DateFrom,
    DateOnly DateTo,
    decimal TotalRevenue,
    decimal TotalCost,
    decimal TotalProfit,
    int TotalDocuments,
    IReadOnlyList<SalesLineDto> Lines
);

public record SalesLineDto(
    Guid ProductId,
    string ProductName,
    string? Sku,
    string Unit,
    decimal QuantitySold,
    decimal Revenue,
    decimal Cost,
    decimal Profit
);

public record StockBalanceDto(
    decimal TotalSellValue,
    decimal TotalBuyValue,
    IReadOnlyList<StockBalanceLineDto> Lines
);

public record StockBalanceLineDto(
    Guid ProductId,
    string ProductName,
    string? Sku,
    string Unit,
    string GroupName,
    Guid BranchId,
    string BranchName,
    decimal Quantity,
    decimal PriceSell,
    decimal PriceBuy,
    decimal TotalSellValue,
    decimal TotalBuyValue
);

public record CounterpartyBalanceDto(
    decimal TotalDebit,
    decimal TotalCredit,
    IReadOnlyList<CounterpartyBalanceLineDto> Lines
);

public record CounterpartyBalanceLineDto(
    Guid Id,
    string Name,
    string Type,
    string? Phone,
    decimal Balance,
    decimal CreditLimit
);

public record DashboardSummaryDto(
    decimal RevenueMonth,
    decimal ProfitMonth,
    decimal DebtorDebt,
    long StockItemCount,
    IReadOnlyList<MonthlySalesDto> MonthlySales
);

public record MonthlySalesDto(
    int Year,
    int Month,
    string MonthLabel,
    decimal Revenue,
    decimal Profit
);
