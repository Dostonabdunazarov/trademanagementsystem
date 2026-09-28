using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
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
        // Retry on optimistic-concurrency conflicts (Stock/Counterparty/Account use the
        // PostgreSQL xmin row-version token). Concurrent confirms touching the same rows
        // would otherwise silently lose an update.
        const int maxAttempts = 3;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await ConfirmAsync(request, cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                // fall through and retry with freshly-read values
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
            throw new UnauthorizedAccessException("Access to this document is not allowed");

        if (doc.Status != DocumentStatus.Draft)
            throw new BusinessException(DocumentErrorCodes.NotDraft,
                $"Document is already {doc.Status}",
                new Dictionary<string, object?> { ["status"] = doc.Status.ToString() });

        // ── курс в базовую валюту (источник истины — сервер, не клиент) ─────────
        // Берём официальный курс из таблицы ExchangeRate (последний на дату документа),
        // пересчитываем TotalAmountBase. Клиентский ExchangeRate в расчёте не участвует.
        var baseCurrency = await db.Currencies
            .FirstOrDefaultAsync(c => c.IsBase, cancellationToken)
            ?? throw new BusinessException(DocumentErrorCodes.NoBaseCurrency, "No base currency is configured");

        decimal serverRate;
        if (doc.CurrencyId == baseCurrency.Id)
        {
            serverRate = 1m;
        }
        else
        {
            var rate = await db.ExchangeRates
                .Where(r => r.FromCurrencyId == doc.CurrencyId
                            && r.ToCurrencyId == baseCurrency.Id
                            && r.Date <= doc.Date)
                .OrderByDescending(r => r.Date)
                .Select(r => (decimal?)r.Rate)
                .FirstOrDefaultAsync(cancellationToken)
                ?? throw new BusinessException(DocumentErrorCodes.ExchangeRateNotFound,
                    $"No exchange rate found for currency {doc.Currency?.Code ?? doc.CurrencyId.ToString()} " +
                    $"to base currency {baseCurrency.Code} on or before {doc.Date}",
                    new Dictionary<string, object?>
                    {
                        ["currency"] = doc.Currency?.Code,
                        ["baseCurrency"] = baseCurrency.Code,
                        ["date"] = doc.Date.ToString("yyyy-MM-dd"),
                    });
            serverRate = rate;
        }

        doc.ExchangeRate = serverRate;
        doc.TotalAmountBase = Math.Round(doc.TotalAmount * serverRate, 2, MidpointRounding.AwayFromZero);

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
        // PayOut             → Balance -= totalBase  (клиент заплатил)
        // Income             → Balance -= totalBase  (мы задолжали поставщику)
        // ReturnToSupplier   → Balance += totalBase  (наш долг уменьшился)
        // PayIn              → Balance += totalBase  (мы заплатили поставщику)

        if (doc.CounterpartyId.HasValue)
        {
            var cp = doc.Counterparty;

            if (cp is not null)
            {
                var balanceDelta = doc.Type switch
                {
                    DocumentType.Expense            => +doc.TotalAmountBase,
                    DocumentType.ReturnFromCustomer => -doc.TotalAmountBase,
                    DocumentType.PayOut             => -doc.TotalAmountBase,
                    DocumentType.Income             => -doc.TotalAmountBase,
                    DocumentType.ReturnToSupplier   => +doc.TotalAmountBase,
                    DocumentType.PayIn              => +doc.TotalAmountBase,
                    _ => 0m
                };

                cp.Balance += balanceDelta;
            }
        }

        // ── касса ─────────────────────────────────────────────────────────────
        // PayIn  → деньги приходят в кассу (+)
        // PayOut → деньги уходят из кассы (-)
        if (doc.Type is DocumentType.PayIn or DocumentType.PayOut && doc.AccountId.HasValue)
        {
            var account = await db.Accounts
                .FirstOrDefaultAsync(a => a.Id == doc.AccountId.Value, cancellationToken);

            if (account is not null)
            {
                // Account balances are kept in the base currency, and the delta we apply is
                // TotalAmountBase. Applying it to an account denominated in another currency would
                // corrupt that account's balance, so require the account to be in the base currency.
                if (account.CurrencyId != baseCurrency.Id)
                    throw new BusinessException(DocumentErrorCodes.AccountCurrencyMismatch,
                        "Payment account currency must match the base currency.",
                        new Dictionary<string, object?> { ["account"] = account.Name, ["baseCurrency"] = baseCurrency.Code });

                var accountDelta = doc.Type == DocumentType.PayIn
                    ? +doc.TotalAmountBase
                    : -doc.TotalAmountBase;

                account.Balance += accountDelta;
            }

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

        // reload with navigations for response
        var confirmed = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == request.Id, cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocConfirm,
            entityType: "Document", entityId: request.Id.ToString(),
            details: JsonSerializer.Serialize(new { type = doc.Type.ToString(), number = doc.Number, total = doc.TotalAmountBase, counterparty = doc.Counterparty?.Name }),
            cancellationToken: cancellationToken);

        return CreateDocumentCommandHandler.MapToDto(confirmed);
    }
}
