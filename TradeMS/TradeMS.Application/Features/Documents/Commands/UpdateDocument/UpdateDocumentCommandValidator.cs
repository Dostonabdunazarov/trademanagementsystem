using FluentValidation;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;

namespace TradeMS.Application.Features.Documents.Commands.UpdateDocument;

public class UpdateDocumentCommandValidator : AbstractValidator<UpdateDocumentCommand>
{
    public UpdateDocumentCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.CurrencyId).NotEmpty().WithErrorCode(DocumentErrorCodes.CurrencyRequired);
        RuleFor(x => x.ExchangeRate).GreaterThan(0).WithErrorCode(DocumentErrorCodes.ExchangeRatePositive);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100).WithErrorCode(DocumentErrorCodes.DiscountRange);
        RuleFor(x => x.Lines).NotEmpty().WithErrorCode(DocumentErrorCodes.LinesRequired).WithMessage("At least one line is required");
        RuleForEach(x => x.Lines).SetValidator(new CreateDocumentLineRequestValidator());
    }
}
