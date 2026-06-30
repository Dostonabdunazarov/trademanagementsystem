using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<Company> Companies { get; }
    DbSet<Branch> Branches { get; }
    DbSet<User> Users { get; }
    DbSet<Counterparty> Counterparties { get; }
    DbSet<Currency> Currencies { get; }
    DbSet<ExchangeRate> ExchangeRates { get; }
    DbSet<ProductGroup> ProductGroups { get; }
    DbSet<Product> Products { get; }
    DbSet<Stock> Stocks { get; }
    DbSet<Document> Documents { get; }
    DbSet<DocumentLine> DocumentLines { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Account> Accounts { get; }
    DbSet<AuditLog> AuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);

    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default);
}
