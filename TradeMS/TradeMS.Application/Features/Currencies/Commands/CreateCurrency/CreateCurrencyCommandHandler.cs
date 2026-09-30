using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Currencies.DTOs;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Currencies.Commands.CreateCurrency;

public class CreateCurrencyCommandHandler(IAppDbContext db)
    : IRequestHandler<CreateCurrencyCommand, CurrencyDto>
{
    public async Task<CurrencyDto> Handle(
        CreateCurrencyCommand request, CancellationToken cancellationToken)
    {
        var code = request.Code.Trim().ToUpperInvariant();
        var exists = await db.Currencies
            .AnyAsync(c => c.Code == code, cancellationToken);
        if (exists)
            throw new BusinessException(ErrorCodes.CurrencyExists, $"Currency '{code}' already exists",
                new Dictionary<string, object?> { ["code"] = code });

        // если создаём базовую — сбрасываем флаг у остальных
        if (request.IsBase)
        {
            // Балансы контрагентов, касс и TotalAmountBase проведённых документов уже посчитаны
            // в текущей базовой валюте. Смена базы молча смешала бы суммы в разных валютах.
            var hasPostings = await db.Documents
                .AnyAsync(d => d.Status != DocumentStatus.Draft, cancellationToken);
            if (hasPostings)
                throw new BusinessException(ErrorCodes.BaseCurrencyLocked,
                    "The base currency cannot be changed after documents have been confirmed");

            var current = await db.Currencies
                .Where(c => c.IsBase)
                .ToListAsync(cancellationToken);
            foreach (var c in current)
                c.IsBase = false;
        }

        var currency = new Currency
        {
            Id     = Guid.NewGuid(),
            Code   = code,
            Name   = request.Name,
            IsBase = request.IsBase
        };

        db.Currencies.Add(currency);
        await db.SaveChangesAsync(cancellationToken);

        return new CurrencyDto(currency.Id, currency.Code, currency.Name, currency.IsBase);
    }
}
