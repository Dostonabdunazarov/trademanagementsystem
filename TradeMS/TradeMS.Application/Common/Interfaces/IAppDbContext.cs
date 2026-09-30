using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

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

    /// <summary>
    /// Забыть все отслеживаемые сущности. Нужен перед повтором операции после
    /// DbUpdateConcurrencyException: иначе повторное чтение вернёт те же (уже изменённые в памяти)
    /// экземпляры со старым xmin, и повтор никогда не пройдёт.
    /// </summary>
    void ClearChangeTracker();

    /// <summary>
    /// Следующий порядковый номер документа для (компания, тип, год). Атомарный
    /// INSERT … ON CONFLICT DO UPDATE … RETURNING — параллельные создания не получают одинаковых
    /// номеров, а удалённые черновики не освобождают номер для повторной выдачи.
    /// </summary>
    Task<int> NextDocumentNumberAsync(Guid companyId, DocumentType type, int year, CancellationToken cancellationToken = default);
}
