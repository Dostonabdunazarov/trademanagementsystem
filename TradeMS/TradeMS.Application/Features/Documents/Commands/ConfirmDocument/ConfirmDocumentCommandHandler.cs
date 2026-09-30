using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.ConfirmDocument;

public class ConfirmDocumentCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<ConfirmDocumentCommand, DocumentDto>
{
    public async Task<DocumentDto> Handle(
        ConfirmDocumentCommand request, CancellationToken cancellationToken)
    {
        // Retry on optimistic-concurrency conflicts (Document/Stock/Counterparty/Account use the
        // PostgreSQL xmin row-version token) and on a concurrent insert of the same stock row.
        // The change tracker must be cleared before retrying: otherwise the re-read returns the
        // already-modified tracked instances (Status = Confirmed, stale xmin) and the retry fails.
        const int maxAttempts = 3;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await ConfirmAsync(request, cancellationToken);
            }
            catch (DbUpdateException ex) when (attempt < maxAttempts &&
                (ex is DbUpdateConcurrencyException || DocumentRules.IsUniqueViolation(ex)))
            {
                db.ClearChangeTracker();
            }
        }
    }

    private async Task<DocumentDto> ConfirmAsync(
        ConfirmDocumentCommand request, CancellationToken cancellationToken)
    {
        await using var transaction = await db.BeginTransactionAsync(cancellationToken);

        var doc = await db.Documents
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Document {request.Id} not found");

        if (request.BranchId.HasValue && doc.BranchId != request.BranchId.Value)
            throw new ForbiddenAccessException("Access to this document is not allowed");

        if (doc.Status != DocumentStatus.Draft)
            throw new BusinessException(DocumentErrorCodes.NotDraft,
                $"Document is already {doc.Status}",
                new Dictionary<string, object?> { ["status"] = doc.Status.ToString() });

        // Ссылки могли устареть с момента создания черновика (контрагент удалён, товар выключен)
        // или прийти из старых черновиков, созданных до проверки принадлежности.
        await DocumentRules.EnsureReferencesAsync(db,
            doc.CompanyId, doc.BranchId, doc.Type,
            doc.CounterpartyId, doc.CurrencyId, doc.AccountId,
            doc.Lines.Select(l => l.ProductId).ToList(),
            doc.Lines.Select(l => l.Quantity).ToList(),
            cancellationToken);

        // ── курс в базовую валюту (источник истины — сервер, не клиент) ─────────
        // Берём официальный курс из таблицы ExchangeRate (последний на дату документа),
        // пересчитываем TotalAmountBase. Клиентский ExchangeRate в расчёте не участвует.
        var baseCurrency = await db.Currencies
            .FirstOrDefaultAsync(c => c.IsBase, cancellationToken)
            ?? throw new BusinessException(DocumentErrorCodes.NoBaseCurrency, "No base currency is configured");

        doc.ExchangeRate = await RateOrThrowAsync(doc.CurrencyId, doc.Currency.Code, baseCurrency, doc.Date, cancellationToken);
        doc.TotalAmountBase = DocumentRules.Money(doc.TotalAmount * doc.ExchangeRate);

        // ── выручка и себестоимость строк в базовой валюте (для отчётов) ─────────
        // Фиксируются в момент проведения: последующая смена закупочной цены или курса
        // не должна задним числом менять прибыль прошлых периодов.
        DocumentRules.DistributeBaseTotals(doc);

        var costRates = new Dictionary<Guid, decimal>();
        foreach (var line in doc.Lines)
        {
            var productCurrencyId = line.Product.CurrencyId;
            if (!costRates.TryGetValue(productCurrencyId, out var costRate))
            {
                var code = await db.Currencies
                    .Where(c => c.Id == productCurrencyId).Select(c => c.Code).FirstAsync(cancellationToken);
                costRate = await RateOrThrowAsync(productCurrencyId, code, baseCurrency, doc.Date, cancellationToken);
                costRates[productCurrencyId] = costRate;
            }
            line.CostBase = DocumentRules.Money(line.Quantity * line.Product.PriceBuy * costRate);
        }

        // ── склад ─────────────────────────────────────────────────────────────
        // Expense / ReturnToSupplier  → уменьшить склад
        // Income  / ReturnFromCustomer → увеличить склад
        // PayOut  / PayIn             → склад не трогаем
        var stockDelta = doc.Type switch
        {
            DocumentType.Expense            => -1m,
            DocumentType.ReturnToSupplier   => -1m,
            DocumentType.Income             => +1m,
            DocumentType.ReturnFromCustomer => +1m,
            _ => 0m
        };

        if (stockDelta != 0m)
        {
            var productIds = doc.Lines.Select(l => l.ProductId).ToList();
            var stocks = await db.Stocks
                .Where(s => productIds.Contains(s.ProductId) && s.BranchId == doc.BranchId)
                .ToListAsync(cancellationToken);
            var stockDict = stocks.ToDictionary(s => s.ProductId);

            foreach (var line in doc.Lines)
            {
                if (!stockDict.TryGetValue(line.ProductId, out var stock))
                {
                    stock = new Stock
                    {
                        Id        = Guid.NewGuid(),
                        ProductId = line.ProductId,
                        BranchId  = doc.BranchId,
                        Quantity  = 0
                    };
                    db.Stocks.Add(stock);
                    stockDict[line.ProductId] = stock;
                }

                var newQty = stock.Quantity + stockDelta * line.Quantity;
                if (newQty < 0)
                    throw new BusinessException(DocumentErrorCodes.InsufficientStock,
                        $"Insufficient stock for product {line.Product?.Name ?? line.ProductId.ToString()}: " +
                        $"available {stock.Quantity}, needed {line.Quantity}",
                        new Dictionary<string, object?>
                        {
                            ["product"] = line.Product?.Name,
                            ["unit"] = line.Product?.Unit.ToString(),
                            ["available"] = stock.Quantity,
                            ["needed"] = line.Quantity,
                        });

                stock.Quantity = newQty;
            }
        }

        // ── баланс контрагента ─────────────────────────────────────────────────
        // Хранится как Balance на Counterparty (денормализованное поле).
        // Положительный баланс = долг клиента перед нами (дебитор).
        // Отрицательный баланс = наш долг поставщику (кредитор).
        //
        // Expense            → Balance += totalBase  (клиент задолжал)
        // ReturnFromCustomer → Balance -= totalBase  (долг клиента уменьшился)
        // PayIn              → Balance -= totalBase  («Приём оплаты»: клиент заплатил нам)
        // Income             → Balance -= totalBase  (мы задолжали поставщику)
        // ReturnToSupplier   → Balance += totalBase  (наш долг уменьшился)
        // PayOut             → Balance += totalBase  («Выплата»: мы заплатили поставщику)
        //
        // Знак совпадает с движением кассы ниже: PayIn — деньги пришли, PayOut — ушли.
        // Та же таблица знаков — в CancelDocumentCommandHandler (с обратным знаком),
        // GetDashboardSummaryQueryHandler и миграции FixPaymentBalanceSemantics.

        if (doc.CounterpartyId.HasValue)
        {
            var cp = doc.Counterparty;

            if (cp is not null)
            {
                var balanceDelta = doc.Type switch
                {
                    DocumentType.Expense            => +doc.TotalAmountBase,
                    DocumentType.ReturnFromCustomer => -doc.TotalAmountBase,
                    DocumentType.PayIn              => -doc.TotalAmountBase,
                    DocumentType.Income             => -doc.TotalAmountBase,
                    DocumentType.ReturnToSupplier   => +doc.TotalAmountBase,
                    DocumentType.PayOut             => +doc.TotalAmountBase,
                    _ => 0m
                };

                cp.Balance += balanceDelta;
            }
        }

        // ── касса ─────────────────────────────────────────────────────────────
        // PayIn  → деньги приходят в кассу (+)
        // PayOut → деньги уходят из кассы (-)
        // Касса обязательна и проверена в EnsureReferencesAsync (та же компания и филиал документа).
        if (DocumentRules.IsPayment(doc.Type))
        {
            var account = await DocumentRules.EnsureAccountAsync(
                db, doc.CompanyId, doc.BranchId, doc.AccountId!.Value, cancellationToken);

            // Account balances are kept in the base currency, and the delta we apply is
            // TotalAmountBase. Applying it to an account denominated in another currency would
            // corrupt that account's balance, so require the account to be in the base currency.
            if (account.CurrencyId != baseCurrency.Id)
                throw new BusinessException(DocumentErrorCodes.AccountCurrencyMismatch,
                    "Payment account currency must match the base currency.",
                    new Dictionary<string, object?> { ["account"] = account.Name, ["baseCurrency"] = baseCurrency.Code });

            account.Balance += doc.Type == DocumentType.PayIn
                ? +doc.TotalAmountBase
                : -doc.TotalAmountBase;

            if (doc.CounterpartyId.HasValue)
            {
                db.Payments.Add(new Payment
                {
                    DocumentId    = doc.Id,
                    CounterpartyId = doc.CounterpartyId.Value,
                    Amount        = doc.TotalAmount,
                    CurrencyId    = doc.CurrencyId,
                    ExchangeRate  = doc.ExchangeRate,
                    AmountBase    = doc.TotalAmountBase,
                    PaymentMethod = doc.PaymentMethod ?? PaymentMethod.Cash,
                    AccountId     = doc.AccountId,
                });
            }
        }

        doc.Status      = DocumentStatus.Confirmed;
        doc.ConfirmedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocConfirm,
            entityType: "Document", entityId: request.Id.ToString(),
            details: JsonSerializer.Serialize(new { type = doc.Type.ToString(), number = doc.Number, total = doc.TotalAmountBase, counterparty = doc.Counterparty?.Name }),
            cancellationToken: cancellationToken);

        return await DocumentRules.LoadDtoAsync(db, request.Id, request.CompanyId, cancellationToken);
    }

    private async Task<decimal> RateOrThrowAsync(
        Guid currencyId, string currencyCode, Currency baseCurrency, DateOnly date, CancellationToken ct)
        => await DocumentRules.FindRateToBaseAsync(db, currencyId, baseCurrency.Id, date, ct)
           ?? throw new BusinessException(DocumentErrorCodes.ExchangeRateNotFound,
               $"No exchange rate found for currency {currencyCode} to base currency {baseCurrency.Code} on or before {date}",
               new Dictionary<string, object?>
               {
                   ["currency"] = currencyCode,
                   ["baseCurrency"] = baseCurrency.Code,
                   ["date"] = date.ToString("yyyy-MM-dd"),
               });
}
