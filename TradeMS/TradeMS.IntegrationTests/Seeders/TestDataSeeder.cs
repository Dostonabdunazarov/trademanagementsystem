using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;
using TradeMS.Infrastructure.Persistence;

namespace TradeMS.IntegrationTests.Seeders;

/// <summary>
/// Seeds deterministic test data into a given AppDbContext.
/// All IDs are stable so tests can reference them via SeedData constants.
/// </summary>
public class TestDataSeeder
{
    public static readonly Guid CompanyId = Guid.Parse("10000000-0000-0000-0000-000000000001");
    public static readonly Guid BranchMainId = Guid.Parse("20000000-0000-0000-0000-000000000001");
    public static readonly Guid BranchWarehouseId = Guid.Parse("20000000-0000-0000-0000-000000000002");
    public static readonly Guid CurrencyUzsId = Guid.Parse("30000000-0000-0000-0000-000000000001");
    public static readonly Guid CurrencyUsdId = Guid.Parse("30000000-0000-0000-0000-000000000002");
    public static readonly Guid UserAdminId = Guid.Parse("40000000-0000-0000-0000-000000000001");
    public static readonly Guid UserManagerId = Guid.Parse("40000000-0000-0000-0000-000000000002");
    public static readonly Guid UserCashierId = Guid.Parse("40000000-0000-0000-0000-000000000003");
    public static readonly Guid UserAdminNoBranchId = Guid.Parse("40000000-0000-0000-0000-000000000004");
    public static readonly Guid AccountCashId = Guid.Parse("50000000-0000-0000-0000-000000000001");

    public const string AdminEmail = "admin@test.com";
    public const string AdminPassword = "Admin123!";
    public const string ManagerEmail = "manager@test.com";
    public const string ManagerPassword = "Manager123!";
    public const string CashierEmail = "cashier@test.com";
    public const string CashierPassword = "Cashier123!";
    // Mirrors the production default admin (Program.cs seed): Admin role with no branch assigned.
    public const string AdminNoBranchEmail = "admin-nobranch@test.com";
    public const string AdminNoBranchPassword = "Admin123!";

    private static readonly string[] GroupNames =
    [
        "Электроника", "Одежда", "Продукты питания", "Мебель", "Бытовая техника",
        "Строительные материалы", "Инструменты", "Канцелярия", "Игрушки", "Книги",
        "Спорттовары", "Аптека", "Автозапчасти", "Садовый инвентарь", "Сантехника",
        "Электрика", "Химия", "Косметика", "Обувь", "Сумки и аксессуары"
    ];

    private static readonly string[] SupplierNames =
    [
        "ООО АльфаСнаб", "ИП Каримов", "ТОО МегаТрейд", "ООО ПрайсМаркет", "ИП Усмонов",
        "ООО ТехноПарк", "ООО ЮнитиПоставка", "ИП Рустамов", "ТОО БизнесМаркет", "ООО ПромСнаб",
        "ИП Хасанов", "ООО НовоТрейд", "ТОО ОптГрупп", "ООО ТоргЦентр", "ИП Матьёқубов",
        "ООО АзияПоставка", "ТОО МинТрейд", "ООО СтабилСнаб", "ИП Ахмедов", "ООО ЕвроЛогист",
        "ТОО ВостокТрейд", "ООО ФармаСнаб", "ИП Назаров", "ООО ГлобалМаркет", "ТОО АбсолютТрейд"
    ];

    private static readonly string[] CustomerNames =
    [
        "Магазин Уют", "ООО РитейлПлюс", "ИП Мирзаев", "Сеть Форте", "ООО ТехноШоп",
        "ИП Тошматов", "Маркет Дом", "ООО АквамаринТрейд", "ИП Джалилов", "Гипермаркет Гурман",
        "ООО СуперМарт", "ИП Юсупов", "Сеть Алибек", "ООО ПрайдМаркет", "ИП Саидов",
        "Маркет Люкс", "ООО НурТрейд", "ИП Холиков", "Сеть Максимум", "ООО ЭлитТоргов",
        "ИП Бахромов", "Маркет Эконом", "ООО КонтинентТрейд", "ИП Умаров", "Сеть Фаворит"
    ];

    private static readonly string[] ProductPrefixes =
    [
        "Базовый", "Стандарт", "Профи", "Эко", "Премиум",
        "Мини", "Макси", "Ультра", "Лайт", "Турбо"
    ];

    public static async Task SeedAsync(AppDbContext db)
    {
        await SeedCompanyAndBranchesAsync(db);
        await SeedCurrenciesAsync(db);
        await SeedUsersAsync(db);
        await SeedAccountsAsync(db);
        await SeedProductGroupsAndProductsAsync(db);
        await SeedCounterpartiesAsync(db);
        await SeedExchangeRatesAsync(db);
    }

    private static async Task SeedCompanyAndBranchesAsync(AppDbContext db)
    {
        if (await db.Companies.AnyAsync(c => c.Id == CompanyId))
            return;

        db.Companies.Add(new Company
        {
            Id = CompanyId,
            Name = "ООО ТестКомпания",
            TaxCode = "123456789",
            Address = "г. Ташкент, ул. Тестовая, 1",
            CreatedAt = DateTime.UtcNow
        });

        db.Branches.AddRange(
            new Branch
            {
                Id = BranchMainId,
                CompanyId = CompanyId,
                Name = "Главный офис",
                Address = "г. Ташкент, ул. Тестовая, 1"
            },
            new Branch
            {
                Id = BranchWarehouseId,
                CompanyId = CompanyId,
                Name = "Склад",
                Address = "г. Ташкент, ул. Складская, 10"
            }
        );

        await db.SaveChangesAsync();
    }

    private static async Task SeedCurrenciesAsync(AppDbContext db)
    {
        if (await db.Currencies.AnyAsync(c => c.Id == CurrencyUzsId))
            return;

        db.Currencies.AddRange(
            new Currency { Id = CurrencyUzsId, Code = "UZS", Name = "Узбекский сум", IsBase = true },
            new Currency { Id = CurrencyUsdId, Code = "USD", Name = "Доллар США", IsBase = false }
        );

        await db.SaveChangesAsync();
    }

    private static async Task SeedUsersAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Id == UserAdminId))
            return;

        db.Users.AddRange(
            new User
            {
                Id = UserAdminId,
                CompanyId = CompanyId,
                BranchId = BranchMainId,
                FullName = "Администратор",
                Email = AdminEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminPassword),
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = UserManagerId,
                CompanyId = CompanyId,
                BranchId = BranchMainId,
                FullName = "Менеджер",
                Email = ManagerEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(ManagerPassword),
                Role = UserRole.Manager,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = UserCashierId,
                CompanyId = CompanyId,
                BranchId = BranchMainId,
                FullName = "Кассир",
                Email = CashierEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(CashierPassword),
                Role = UserRole.Cashier,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            },
            new User
            {
                Id = UserAdminNoBranchId,
                CompanyId = CompanyId,
                BranchId = null,
                FullName = "Администратор без филиала",
                Email = AdminNoBranchEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(AdminNoBranchPassword),
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            }
        );

        await db.SaveChangesAsync();
    }

    private static async Task SeedAccountsAsync(AppDbContext db)
    {
        if (await db.Accounts.AnyAsync(a => a.Id == AccountCashId))
            return;

        db.Accounts.Add(new Account
        {
            Id = AccountCashId,
            CompanyId = CompanyId,
            BranchId = BranchMainId,
            Name = "Основная касса",
            Type = AccountType.Cash,
            CurrencyId = CurrencyUzsId,
            Balance = 0
        });

        await db.SaveChangesAsync();
    }

    private static async Task SeedProductGroupsAndProductsAsync(AppDbContext db)
    {
        if (await db.ProductGroups.AnyAsync(g => g.CompanyId == CompanyId))
            return;

        var units = Enum.GetValues<ProductUnit>();
        var groups = new List<ProductGroup>();

        for (int i = 0; i < GroupNames.Length; i++)
        {
            groups.Add(new ProductGroup
            {
                Id = Guid.Parse($"60000000-0000-0000-0000-{(i + 1):D12}"),
                CompanyId = CompanyId,
                Name = GroupNames[i]
            });
        }

        db.ProductGroups.AddRange(groups);
        await db.SaveChangesAsync();

        var products = new List<Product>();
        int productIndex = 0;

        foreach (var group in groups)
        {
            for (int j = 0; j < 10; j++)
            {
                productIndex++;
                var prefix = ProductPrefixes[j];
                var priceBuy = 10_000m + productIndex * 500m;
                var priceSell = priceBuy * 1.2m;

                products.Add(new Product
                {
                    Id = Guid.Parse($"70000000-0000-0000-0000-{productIndex:D12}"),
                    CompanyId = CompanyId,
                    GroupId = group.Id,
                    Name = $"{prefix} {group.Name} #{productIndex}",
                    Sku = $"SKU-{productIndex:D5}",
                    Barcode = $"869{productIndex:D10}",
                    Unit = units[productIndex % units.Length],
                    PriceBuy = priceBuy,
                    PriceSell = Math.Round(priceSell, 2),
                    CurrencyId = CurrencyUzsId,
                    IsActive = true
                });
            }
        }

        db.Products.AddRange(products);
        await db.SaveChangesAsync();
    }

    private static async Task SeedCounterpartiesAsync(AppDbContext db)
    {
        if (await db.Counterparties.AnyAsync(c => c.CompanyId == CompanyId))
            return;

        var counterparties = new List<Counterparty>();

        for (int i = 0; i < SupplierNames.Length; i++)
        {
            counterparties.Add(new Counterparty
            {
                Id = Guid.Parse($"80000000-0000-0000-0001-{(i + 1):D12}"),
                CompanyId = CompanyId,
                Type = CounterpartyType.Supplier,
                Name = SupplierNames[i],
                Phone = $"+998 90 {100_0000 + i * 111:D7}",
                Address = $"г. Ташкент, ул. Поставщиков, {i + 1}",
                CreditLimit = 50_000_000m,
                Balance = 0,
                CreatedAt = DateTime.UtcNow
            });
        }

        for (int i = 0; i < CustomerNames.Length; i++)
        {
            counterparties.Add(new Counterparty
            {
                Id = Guid.Parse($"80000000-0000-0000-0002-{(i + 1):D12}"),
                CompanyId = CompanyId,
                Type = CounterpartyType.Customer,
                Name = CustomerNames[i],
                Phone = $"+998 91 {200_0000 + i * 111:D7}",
                Address = $"г. Ташкент, ул. Покупателей, {i + 1}",
                CreditLimit = 10_000_000m,
                Balance = 0,
                CreatedAt = DateTime.UtcNow
            });
        }

        db.Counterparties.AddRange(counterparties);
        await db.SaveChangesAsync();
    }

    private static async Task SeedExchangeRatesAsync(AppDbContext db)
    {
        if (await db.ExchangeRates.AnyAsync())
            return;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        db.ExchangeRates.Add(new ExchangeRate
        {
            Id = Guid.NewGuid(),
            FromCurrencyId = CurrencyUsdId,
            ToCurrencyId = CurrencyUzsId,
            Rate = 12_700m,
            Date = today
        });

        await db.SaveChangesAsync();
    }

    public static Guid GetProductGroupId(int index) =>
        Guid.Parse($"60000000-0000-0000-0000-{(index + 1):D12}");

    public static Guid GetProductId(int index) =>
        Guid.Parse($"70000000-0000-0000-0000-{index:D12}");

    public static Guid GetSupplierId(int index) =>
        Guid.Parse($"80000000-0000-0000-0001-{(index + 1):D12}");

    public static Guid GetCustomerId(int index) =>
        Guid.Parse($"80000000-0000-0000-0002-{(index + 1):D12}");
}
