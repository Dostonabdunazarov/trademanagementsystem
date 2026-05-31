using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;

namespace TradeMS.Application.Features.Counterparties.Commands.DeleteCounterparty;

public class DeleteCounterpartyCommandHandler(IAppDbContext db)
    : IRequestHandler<DeleteCounterpartyCommand>
{
    public async Task Handle(DeleteCounterpartyCommand request, CancellationToken cancellationToken)
    {
        var counterparty = await db.Counterparties
            .FirstOrDefaultAsync(
                c => c.Id == request.Id && c.CompanyId == request.CompanyId && c.DeletedAt == null,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Counterparty {request.Id} not found");

        counterparty.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }
}
