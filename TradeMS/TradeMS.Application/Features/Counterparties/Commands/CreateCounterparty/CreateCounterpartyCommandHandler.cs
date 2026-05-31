using MediatR;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Counterparties.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Counterparties.Commands.CreateCounterparty;

public class CreateCounterpartyCommandHandler(IAppDbContext db)
    : IRequestHandler<CreateCounterpartyCommand, CounterpartyDto>
{
    public async Task<CounterpartyDto> Handle(
        CreateCounterpartyCommand request, CancellationToken cancellationToken)
    {
        var counterparty = new Counterparty
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            Type = request.Type,
            Name = request.Name,
            Phone = request.Phone,
            Address = request.Address,
            CreditLimit = request.CreditLimit,
            CreatedAt = DateTime.UtcNow
        };

        db.Counterparties.Add(counterparty);
        await db.SaveChangesAsync(cancellationToken);

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
