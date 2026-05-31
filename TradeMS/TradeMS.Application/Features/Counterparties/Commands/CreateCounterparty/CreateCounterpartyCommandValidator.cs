using FluentValidation;

namespace TradeMS.Application.Features.Counterparties.Commands.CreateCounterparty;

public class CreateCounterpartyCommandValidator : AbstractValidator<CreateCounterpartyCommand>
{
    public CreateCounterpartyCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Phone).MaximumLength(50).When(x => x.Phone != null);
        RuleFor(x => x.CreditLimit).GreaterThanOrEqualTo(0);
    }
}
