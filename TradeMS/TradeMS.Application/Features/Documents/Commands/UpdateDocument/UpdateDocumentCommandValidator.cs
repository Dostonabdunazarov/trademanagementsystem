using FluentValidation;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;

namespace TradeMS.Application.Features.Documents.Commands.UpdateDocument;

public class UpdateDocumentCommandValidator : AbstractValidator<UpdateDocumentCommand>
{
    public UpdateDocumentCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.CurrencyId).NotEmpty();
        RuleFor(x => x.ExchangeRate).GreaterThan(0);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100);
        RuleFor(x => x.Lines).NotEmpty().WithMessage("At least one line is required");
        RuleForEach(x => x.Lines).SetValidator(new CreateDocumentLineRequestValidator());
    }
}
