using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;

namespace TradeMS.Application.Features.Accounts.Commands.DeleteAccount;

public class DeleteAccountCommandHandler(IAppDbContext db)
    : IRequestHandler<DeleteAccountCommand>
{
    public async Task Handle(DeleteAccountCommand request, CancellationToken cancellationToken)
    {
        var account = await db.Accounts
            .FirstOrDefaultAsync(
                a => a.Id == request.Id && a.CompanyId == request.CompanyId,
                cancellationToken)
            ?? throw new KeyNotFoundException($"Account {request.Id} not found");

        db.Accounts.Remove(account);
        await db.SaveChangesAsync(cancellationToken);
    }
}
