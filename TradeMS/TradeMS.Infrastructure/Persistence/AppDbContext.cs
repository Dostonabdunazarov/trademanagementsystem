using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

namespace TradeMS.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Branch> Branches => Set<Branch>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Counterparty> Counterparties => Set<Counterparty>();
    public DbSet<Currency> Currencies => Set<Currency>();
    public DbSet<ExchangeRate> ExchangeRates => Set<ExchangeRate>();
    public DbSet<ProductGroup> ProductGroups => Set<ProductGroup>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentLine> DocumentLines => Set<DocumentLine>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        => Database.BeginTransactionAsync(cancellationToken);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Company>(e =>
        {
            e.ToTable("companies");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.TaxCode).HasMaxLength(50);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
        });

        modelBuilder.Entity<Branch>(e =>
        {
            e.ToTable("branches");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Company).WithMany(x => x.Branches).HasForeignKey(x => x.CompanyId);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.FullName).HasMaxLength(200).IsRequired();
            e.Property(x => x.Email).HasMaxLength(200).IsRequired();
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.RefreshToken).HasMaxLength(500);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(x => x.Company).WithMany(x => x.Users).HasForeignKey(x => x.CompanyId);
            e.HasOne(x => x.Branch).WithMany(x => x.Users).HasForeignKey(x => x.BranchId).IsRequired(false);
            e.Property(x => x.FailedLoginCount).HasDefaultValue(0);
        });

        modelBuilder.Entity<Counterparty>(e =>
        {
            e.ToTable("counterparties");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(50);
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.CreditLimit).HasPrecision(18, 2);
            e.Property(x => x.Balance).HasPrecision(18, 2);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(x => x.Company).WithMany(x => x.Counterparties).HasForeignKey(x => x.CompanyId);
            // Optimistic concurrency on the denormalized Balance field (read-modify-write on confirm).
            // Maps PostgreSQL's system xmin column as a row-version token — no schema change required.
            e.Property<uint>("xmin").IsRowVersion();
        });

        modelBuilder.Entity<Currency>(e =>
        {
            e.ToTable("currencies");
            e.HasKey(x => x.Id);
            e.Property(x => x.Code).HasMaxLength(3).IsRequired();
            e.Property(x => x.Name).HasMaxLength(50).IsRequired();
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<ExchangeRate>(e =>
        {
            e.ToTable("exchange_rates");
            e.HasKey(x => x.Id);
            e.Property(x => x.Rate).HasPrecision(18, 6);
            e.HasIndex(x => new { x.FromCurrencyId, x.ToCurrencyId, x.Date }).IsUnique();
            e.HasOne(x => x.FromCurrency).WithMany(x => x.ExchangeRatesFrom).HasForeignKey(x => x.FromCurrencyId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ToCurrency).WithMany(x => x.ExchangeRatesTo).HasForeignKey(x => x.ToCurrencyId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProductGroup>(e =>
        {
            e.ToTable("product_groups");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.HasOne(x => x.Company).WithMany(x => x.ProductGroups).HasForeignKey(x => x.CompanyId);
            e.HasOne(x => x.Parent).WithMany(x => x.Children).HasForeignKey(x => x.ParentId).IsRequired(false).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Product>(e =>
        {
            e.ToTable("products");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(300).IsRequired();
            e.Property(x => x.Sku).HasMaxLength(100);
            e.Property(x => x.Barcode).HasMaxLength(100);
            e.Property(x => x.Unit).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.PriceSell).HasPrecision(18, 2);
            e.Property(x => x.PriceBuy).HasPrecision(18, 2);
            e.HasOne(x => x.Company).WithMany(x => x.Products).HasForeignKey(x => x.CompanyId);
            e.HasOne(x => x.Group).WithMany(x => x.Products).HasForeignKey(x => x.GroupId).IsRequired(false);
            e.HasOne(x => x.Currency).WithMany(x => x.Products).HasForeignKey(x => x.CurrencyId);
        });

        modelBuilder.Entity<Stock>(e =>
        {
            e.ToTable("stock");
            e.HasKey(x => x.Id);
            e.Property(x => x.Quantity).HasPrecision(18, 4);
            e.HasIndex(x => new { x.ProductId, x.BranchId }).IsUnique();
            e.HasOne(x => x.Product).WithMany(x => x.Stocks).HasForeignKey(x => x.ProductId);
            e.HasOne(x => x.Branch).WithMany(x => x.Stocks).HasForeignKey(x => x.BranchId);
            // Optimistic concurrency: prevent lost stock updates under concurrent confirms.
            e.Property<uint>("xmin").IsRowVersion();
        });

        modelBuilder.Entity<Document>(e =>
        {
            e.ToTable("documents");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).UseIdentityAlwaysColumn();
            e.Property(x => x.Number).HasMaxLength(30).IsRequired();
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.ExchangeRate).HasPrecision(18, 6);
            e.Property(x => x.TotalAmount).HasPrecision(18, 2);
            e.Property(x => x.TotalAmountBase).HasPrecision(18, 2);
            e.Property(x => x.DiscountPercent).HasPrecision(5, 2);
            e.Property(x => x.DiscountAmount).HasPrecision(18, 2);
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.PaymentMethod).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(x => x.Company).WithMany(x => x.Documents).HasForeignKey(x => x.CompanyId);
            e.HasOne(x => x.Branch).WithMany(x => x.Documents).HasForeignKey(x => x.BranchId);
            e.HasOne(x => x.Counterparty).WithMany(x => x.Documents).HasForeignKey(x => x.CounterpartyId).IsRequired(false);
            e.HasOne(x => x.Currency).WithMany(x => x.Documents).HasForeignKey(x => x.CurrencyId);
            e.HasOne(x => x.Creator).WithMany().HasForeignKey(x => x.CreatedBy).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Account).WithMany().HasForeignKey(x => x.AccountId).IsRequired(false);
        });

        modelBuilder.Entity<DocumentLine>(e =>
        {
            e.ToTable("document_lines");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).UseIdentityAlwaysColumn();
            e.Property(x => x.Quantity).HasPrecision(18, 4);
            e.Property(x => x.Price).HasPrecision(18, 2);
            e.Property(x => x.DiscountPercent).HasPrecision(5, 2);
            e.Property(x => x.DiscountPrice).HasPrecision(18, 2);
            e.Property(x => x.Total).HasPrecision(18, 2);
            e.HasOne(x => x.Document).WithMany(x => x.Lines).HasForeignKey(x => x.DocumentId);
            e.HasOne(x => x.Product).WithMany(x => x.DocumentLines).HasForeignKey(x => x.ProductId);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.ToTable("payments");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).UseIdentityAlwaysColumn();
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.Property(x => x.ExchangeRate).HasPrecision(18, 6);
            e.Property(x => x.AmountBase).HasPrecision(18, 2);
            e.Property(x => x.PaymentMethod).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.Document).WithMany(x => x.Payments).HasForeignKey(x => x.DocumentId);
            e.HasOne(x => x.Counterparty).WithMany(x => x.Payments).HasForeignKey(x => x.CounterpartyId);
            e.HasOne(x => x.Currency).WithMany(x => x.Payments).HasForeignKey(x => x.CurrencyId);
            e.HasOne(x => x.Account).WithMany(x => x.Payments).HasForeignKey(x => x.AccountId).IsRequired(false);
        });

        modelBuilder.Entity<Account>(e =>
        {
            e.ToTable("accounts");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200).IsRequired();
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(20);
            e.Property(x => x.Balance).HasPrecision(18, 2);
            e.HasOne(x => x.Company).WithMany(x => x.Accounts).HasForeignKey(x => x.CompanyId);
            e.HasOne(x => x.Branch).WithMany(x => x.Accounts).HasForeignKey(x => x.BranchId);
            e.HasOne(x => x.Currency).WithMany(x => x.Accounts).HasForeignKey(x => x.CurrencyId);
            // Optimistic concurrency: prevent lost balance updates under concurrent confirms.
            e.Property<uint>("xmin").IsRowVersion();
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.ToTable("audit_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).UseIdentityAlwaysColumn();
            e.Property(x => x.CompanyId).IsRequired();
            e.Property(x => x.Action).HasMaxLength(50).IsRequired();
            e.Property(x => x.EntityType).HasMaxLength(50);
            e.Property(x => x.EntityId).HasMaxLength(100);
            e.Property(x => x.IpAddress).HasMaxLength(50);
            e.Property(x => x.UserAgent).HasMaxLength(500);
            e.Property(x => x.UserEmail).HasMaxLength(200);
            e.Property(x => x.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId)
                .IsRequired(false).OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(x => x.CreatedAt);
            e.HasIndex(x => x.Action);
            e.HasIndex(x => new { x.CompanyId, x.CreatedAt });
        });
    }
}
