using FluentValidation;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.UpdateDocument;

/// <summary>
/// Правила, не зависящие от типа документа. Тип известен только после загрузки документа,
/// поэтому «строки обязательны» / «сумма и касса обязательны» проверяет обработчик.
/// </summary>
public class UpdateDocumentCommandValidator : AbstractValidator<UpdateDocumentCommand>
{
    public UpdateDocumentCommandValidator()
    {
        RuleFor(x => x.Id).GreaterThan(0);
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.CurrencyId).NotEmpty().WithErrorCode(DocumentErrorCodes.CurrencyRequired);
        RuleFor(x => x.ExchangeRate).GreaterThan(0).WithErrorCode(DocumentErrorCodes.ExchangeRatePositive);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100).WithErrorCode(DocumentErrorCodes.DiscountRange);
        RuleFor(x => x.CounterpartyId)
            .NotNull().WithErrorCode(DocumentErrorCodes.CounterpartyRequired).WithMessage("Counterparty is required");
        RuleFor(x => x.Note).MaximumLength(1000);
        RuleForEach(x => x.Lines).SetValidator(new CreateDocumentLineRequestValidator());
        RuleFor(x => x.Amount)
            .GreaterThan(0).WithErrorCode(DocumentErrorCodes.AmountPositive)
            .When(x => x.Amount.HasValue);
        RuleFor(x => x.PaymentMethod)
            .Must(pm => string.IsNullOrEmpty(pm) || Enum.TryParse<PaymentMethod>(pm, true, out _))
            .WithErrorCode(DocumentErrorCodes.InvalidPaymentMethod);
    }
}
