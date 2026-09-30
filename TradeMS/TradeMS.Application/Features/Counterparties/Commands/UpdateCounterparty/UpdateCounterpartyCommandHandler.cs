using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Counterparties.Commands.UpdateCounterparty;

public class UpdateCounterpartyCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<UpdateCounterpartyCommand, CounterpartyDto>
{
    public async Task<CounterpartyDto> Handle(
        UpdateCounterpartyCommand request, CancellationToken cancellationToken)
    {
        var counterparty = await db.Counterparties
            .FirstOrDefaultAsync(
                c => c.Id == request.Id && c.CompanyId == request.CompanyId && c.DeletedAt == null,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Counterparty {request.Id} not found");

        counterparty.Type = request.Type;
        counterparty.Name = request.Name;
        counterparty.Phone = request.Phone;
        counterparty.Address = request.Address;
        counterparty.CreditLimit = request.CreditLimit;

        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.CounterpartyUpdate,
            entityType: "Counterparty", entityId: request.Id.ToString(),
            cancellationToken: cancellationToken);

        return new CounterpartyDto(
            counterparty.Id,
            counterparty.CompanyId,
            counterparty.Type.ToString(),
            counterparty.Name,
            counterparty.Phone,
            counterparty.Address,
            counterparty.CreditLimit,
            counterparty.Balance,
            counterparty.CreatedAt
        );
    }
}
