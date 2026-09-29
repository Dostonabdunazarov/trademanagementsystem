using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.CancelDocument;

/// <summary>
/// Reverses a Confirmed document: undoes the stock, counterparty-balance and account-balance
/// movements applied at confirm time, removes the generated payment row, and marks the document
/// Cancelled. This is the only supported way to unwind a confirmed document — Update/Delete refuse
/// non-Draft documents on purpose.
/// </summary>
public class CancelDocumentCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<CancelDocumentCommand, DocumentDto>
{
    public async Task<DocumentDto> Handle(
        CancelDocumentCommand request, CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await CancelAsync(request, cancellationToken);
            }
            catch (DbUpdateConcurrencyException) when (attempt < maxAttempts)
            {
                // retry with freshly-read values
            }
        }
    }

    private async Task<DocumentDto> CancelAsync(
        CancelDocumentCommand request, CancellationToken cancellationToken)
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

        if (doc.Status != DocumentStatus.Confirmed)
            throw new BusinessException(DocumentErrorCodes.NotConfirmed,
                $"Only Confirmed documents can be cancelled (document is {doc.Status})",
                new Dictionary<string, object?> { ["status"] = doc.Status.ToString() });

        // ── склад: откат подтверждения (знак противоположен Confirm) ───────────────
        var reverseStockDelta = doc.Type switch
        {
            DocumentType.Expense            => +1m,
            DocumentType.ReturnToSupplier   => +1m,
            DocumentType.Income             => -1m,
            DocumentType.ReturnFromCustomer => -1m,
            _ => 0m
        };

        if (reverseStockDelta != 0m)
        {
            var productIds = doc.Lines.Select(l => l.ProductId).ToList();
            var stocks = await db.Stocks
                .Where(s => productIds.Contains(s.ProductId) && s.BranchId == doc.BranchId)
                .ToListAsync(cancellationToken);
            var stockDict = stocks.ToDictionary(s => s.ProductId);

            foreach (var line in doc.Lines)
            {
                if (!stockDict.TryGetValue(line.ProductId, out var stock))
                    continue; // no stock row → nothing to reverse for this product

                var newQty = stock.Quantity + reverseStockDelta * line.Quantity;
                if (newQty < 0)
                    throw new BusinessException(DocumentErrorCodes.CancelStockConsumed,
                        $"Cannot cancel: reversing would drive stock negative for product {line.Product?.Name ?? line.ProductId.ToString()} " +
                        $"(current {stock.Quantity}, reversing {line.Quantity}). " +
                        "The stock has already been consumed by later documents.",
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

        // ── баланс контрагента: откат (знак противоположен Confirm) ────────────────
        if (doc.CounterpartyId.HasValue && doc.Counterparty is not null)
        {
            var reverseBalanceDelta = doc.Type switch
            {
                DocumentType.Expense            => -doc.TotalAmountBase,
                DocumentType.ReturnFromCustomer => +doc.TotalAmountBase,
                DocumentType.PayIn              => +doc.TotalAmountBase,
                DocumentType.Income             => +doc.TotalAmountBase,
                DocumentType.ReturnToSupplier   => -doc.TotalAmountBase,
                DocumentType.PayOut             => -doc.TotalAmountBase,
                _ => 0m
            };

            doc.Counterparty.Balance += reverseBalanceDelta;
        }

        // ── касса + платёж: откат (знак противоположен Confirm) ────────────────────
        if (doc.Type is DocumentType.PayIn or DocumentType.PayOut && doc.AccountId.HasValue)
        {
            var account = await db.Accounts
                .FirstOrDefaultAsync(a => a.Id == doc.AccountId.Value, cancellationToken);

            if (account is not null)
            {
                var reverseAccountDelta = doc.Type == DocumentType.PayIn
                    ? -doc.TotalAmountBase
                    : +doc.TotalAmountBase;

                account.Balance += reverseAccountDelta;
            }

            // remove payment row(s) generated at confirm
            var payments = await db.Payments
                .Where(p => p.DocumentId == doc.Id)
                .ToListAsync(cancellationToken);
            if (payments.Count > 0)
                db.Payments.RemoveRange(payments);
        }

        doc.Status = DocumentStatus.Cancelled;

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        var cancelled = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Account)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId, cancellationToken);

        await auditLogger.LogAsync(AuditActions.DocCancel,
            entityType: "Document", entityId: request.Id.ToString(),
            details: JsonSerializer.Serialize(new { type = doc.Type.ToString(), number = doc.Number, total = doc.TotalAmountBase, counterparty = doc.Counterparty?.Name }),
            cancellationToken: cancellationToken);

        return CreateDocumentCommandHandler.MapToDto(cancelled);
    }
}
