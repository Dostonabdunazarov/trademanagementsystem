using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Currencies.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Currencies.Commands.CreateCurrency;

public class CreateCurrencyCommandHandler(IAppDbContext db)
    : IRequestHandler<CreateCurrencyCommand, CurrencyDto>
{
    public async Task<CurrencyDto> Handle(
        CreateCurrencyCommand request, CancellationToken cancellationToken)
    {
        var exists = await db.Currencies
            .AnyAsync(c => c.Code == request.Code.ToUpper(), cancellationToken);
        if (exists)
            throw new InvalidOperationException($"Currency '{request.Code}' already exists");

        // если создаём базовую — сбрасываем флаг у остальных
        if (request.IsBase)
        {
            var current = await db.Currencies
                .Where(c => c.IsBase)
                .ToListAsync(cancellationToken);
            foreach (var c in current)
                c.IsBase = false;
        }

        var currency = new Currency
        {
            Id     = Guid.NewGuid(),
            Code   = request.Code.ToUpper(),
            Name   = request.Name,
            IsBase = request.IsBase
        };

        db.Currencies.Add(currency);
        await db.SaveChangesAsync(cancellationToken);

        return new CurrencyDto(currency.Id, currency.Code, currency.Name, currency.IsBase);
    }
}
