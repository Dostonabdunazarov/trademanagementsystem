using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.ConfirmDocument;

public class ConfirmDocumentCommandHandler(IAppDbContext db)
    : IRequestHandler<ConfirmDocumentCommand, DocumentDto>
{
    public async Task<DocumentDto> Handle(
        ConfirmDocumentCommand request, CancellationToken cancellationToken)
    {
        var doc = await db.Documents
            .Include(d => d.Lines)
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .FirstOrDefaultAsync(d => d.Id == request.Id && d.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Document {request.Id} not found");

        if (request.BranchId.HasValue && doc.BranchId != request.BranchId.Value)
            throw new UnauthorizedAccessException("Access to this document is not allowed");

        if (doc.Status != DocumentStatus.Draft)
            throw new InvalidOperationException($"Document is already {doc.Status}");

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
            foreach (var line in doc.Lines)
            {
                var stock = await db.Stocks
                    .FirstOrDefaultAsync(s => s.ProductId == line.ProductId
                                           && s.BranchId  == doc.BranchId,
                        cancellationToken);

                if (stock is null)
                {
                    stock = new Stock
                    {
                        Id        = Guid.NewGuid(),
                        ProductId = line.ProductId,
                        BranchId  = doc.BranchId,
                        Quantity  = 0
                    };
                    db.Stocks.Add(stock);
                }

                var newQty = stock.Quantity + stockDelta * line.Quantity;
                if (newQty < 0)
                    throw new InvalidOperationException(
                        $"Insufficient stock for product {line.ProductId}: " +
                        $"available {stock.Quantity}, needed {line.Quantity}");

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
            var cp = await db.Counterparties
                .FirstOrDefaultAsync(c => c.Id == doc.CounterpartyId.Value, cancellationToken);

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

        doc.Status      = DocumentStatus.Confirmed;
        doc.ConfirmedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(cancellationToken);

        // reload with navigations for response
        var confirmed = await db.Documents
            .Include(d => d.Counterparty)
            .Include(d => d.Currency)
            .Include(d => d.Lines).ThenInclude(l => l.Product)
            .FirstAsync(d => d.Id == request.Id, cancellationToken);

        return CreateDocumentCommandHandler.MapToDto(confirmed);
    }
}
