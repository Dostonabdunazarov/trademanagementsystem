using FluentValidation;

namespace TradeMS.Application.Features.Currencies.Commands.CreateExchangeRate;

public class CreateExchangeRateCommandValidator : AbstractValidator<CreateExchangeRateCommand>
{
    public CreateExchangeRateCommandValidator()
    {
        RuleFor(x => x.FromCurrencyId).NotEmpty();
        RuleFor(x => x.ToCurrencyId).NotEmpty();
        RuleFor(x => x.ToCurrencyId).NotEqual(x => x.FromCurrencyId)
            .WithMessage("From and To currencies must be different");
        RuleFor(x => x.Rate).GreaterThan(0);
    }
}
