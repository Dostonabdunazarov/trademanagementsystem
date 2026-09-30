using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Accounts.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Accounts.Commands.CreateAccount;

public class CreateAccountCommandHandler(IAppDbContext db, IAuditLogger auditLogger)
    : IRequestHandler<CreateAccountCommand, AccountDto>
{
    public async Task<AccountDto> Handle(
        CreateAccountCommand request, CancellationToken cancellationToken)
    {
        if (!await db.Branches.AnyAsync(b => b.Id == request.BranchId && b.CompanyId == request.CompanyId, cancellationToken))
            throw new BusinessException(DocumentErrorCodes.InvalidBranch, "Branch not found");

        var currency = await db.Currencies
            .FirstOrDefaultAsync(c => c.Id == request.CurrencyId, cancellationToken)
            ?? throw new BusinessException(DocumentErrorCodes.InvalidCurrency, "Currency not found");

        var account = new Account
        {
            Id = Guid.NewGuid(),
            CompanyId = request.CompanyId,
            BranchId = request.BranchId,
            Name = request.Name,
            Type = request.Type,
            CurrencyId = request.CurrencyId,
            Balance = 0
        };

        db.Accounts.Add(account);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.AccountCreate,
            entityType: "Account", entityId: account.Id.ToString(),
            cancellationToken: cancellationToken);

        return new AccountDto(
            account.Id,
            account.CompanyId,
            account.BranchId,
            account.Name,
            account.Type.ToString(),
            account.CurrencyId,
            currency.Code,
            account.Balance
        );
    }
}
