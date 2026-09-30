using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Counterparties.Commands.DeleteCounterparty;

public class DeleteCounterpartyCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<DeleteCounterpartyCommand>
{
    public async Task Handle(DeleteCounterpartyCommand request, CancellationToken cancellationToken)
    {
        var counterparty = await db.Counterparties
            .FirstOrDefaultAsync(
                c => c.Id == request.Id && c.CompanyId == request.CompanyId && c.DeletedAt == null,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Counterparty {request.Id} not found");

        // Soft-delete контрагента с долгом прячет долг из отчётов — сначала нужно рассчитаться.
        if (counterparty.Balance != 0)
            throw new BusinessException(ErrorCodes.CounterpartyHasBalance,
                "Cannot delete a counterparty with a non-zero balance",
                new Dictionary<string, object?> { ["balance"] = counterparty.Balance });

        var snapshot = JsonSerializer.Serialize(new { name = counterparty.Name });

        counterparty.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.CounterpartyDelete,
            entityType: "Counterparty", entityId: request.Id.ToString(),
            details: snapshot,
            cancellationToken: cancellationToken);
    }
}
