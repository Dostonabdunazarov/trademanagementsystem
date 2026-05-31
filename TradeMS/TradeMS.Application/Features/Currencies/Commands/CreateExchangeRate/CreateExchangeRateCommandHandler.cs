using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Currencies.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Currencies.Commands.CreateExchangeRate;

public class CreateExchangeRateCommandHandler(IAppDbContext db)
    : IRequestHandler<CreateExchangeRateCommand, ExchangeRateDto>
{
    public async Task<ExchangeRateDto> Handle(
        CreateExchangeRateCommand request, CancellationToken cancellationToken)
    {
        // уникальность: одна запись на пару валют в день (upsert)
        var existing = await db.ExchangeRates
            .Include(r => r.FromCurrency)
            .Include(r => r.ToCurrency)
            .FirstOrDefaultAsync(r =>
                r.FromCurrencyId == request.FromCurrencyId &&
                r.ToCurrencyId   == request.ToCurrencyId   &&
                r.Date           == request.Date,
                cancellationToken);

        if (existing is not null)
        {
            existing.Rate = request.Rate;
            await db.SaveChangesAsync(cancellationToken);
            return new ExchangeRateDto(
                existing.Id,
                existing.FromCurrencyId, existing.FromCurrency.Code,
                existing.ToCurrencyId,   existing.ToCurrency.Code,
                existing.Rate, existing.Date);
        }

        var rate = new ExchangeRate
        {
            Id             = Guid.NewGuid(),
            FromCurrencyId = request.FromCurrencyId,
            ToCurrencyId   = request.ToCurrencyId,
            Rate           = request.Rate,
            Date           = request.Date
        };

        db.ExchangeRates.Add(rate);
        await db.SaveChangesAsync(cancellationToken);

        // reload для навигационных свойств
        await db.ExchangeRates.Entry(rate).Reference(r => r.FromCurrency).LoadAsync(cancellationToken);
        await db.ExchangeRates.Entry(rate).Reference(r => r.ToCurrency).LoadAsync(cancellationToken);

        return new ExchangeRateDto(
            rate.Id,
            rate.FromCurrencyId, rate.FromCurrency.Code,
            rate.ToCurrencyId,   rate.ToCurrency.Code,
            rate.Rate, rate.Date);
    }
}
