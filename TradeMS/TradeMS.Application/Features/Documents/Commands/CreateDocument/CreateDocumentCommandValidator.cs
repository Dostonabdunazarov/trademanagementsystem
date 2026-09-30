using FluentValidation;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.CreateDocument;

public class CreateDocumentCommandValidator : AbstractValidator<CreateDocumentCommand>
{
    public CreateDocumentCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.BranchId).NotEmpty().WithErrorCode(DocumentErrorCodes.BranchRequired);
        RuleFor(x => x.CurrencyId).NotEmpty().WithErrorCode(DocumentErrorCodes.CurrencyRequired);
        RuleFor(x => x.ExchangeRate).GreaterThan(0).WithErrorCode(DocumentErrorCodes.ExchangeRatePositive);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100).WithErrorCode(DocumentErrorCodes.DiscountRange);
        RuleFor(x => x.CounterpartyId)
            .NotNull().WithErrorCode(DocumentErrorCodes.CounterpartyRequired).WithMessage("Counterparty is required");
        RuleFor(x => x.Note).MaximumLength(1000);

        // Payment documents (PayIn/PayOut) carry no lines — the moved money is in Amount.
        When(x => x.Type is DocumentType.PayIn or DocumentType.PayOut, () =>
        {
            RuleFor(x => x.Amount)
                .NotNull().WithErrorCode(DocumentErrorCodes.AmountRequired).WithMessage("Amount is required for payment documents")
                .GreaterThan(0).WithErrorCode(DocumentErrorCodes.AmountPositive).WithMessage("Payment amount must be greater than zero");
            RuleFor(x => x.AccountId)
                .NotNull().WithErrorCode(DocumentErrorCodes.AccountRequired).WithMessage("Account is required for payment documents");
            RuleFor(x => x.PaymentMethod)
                .Must(pm => string.IsNullOrEmpty(pm) || Enum.TryParse<PaymentMethod>(pm, true, out _))
                .WithErrorCode(DocumentErrorCodes.InvalidPaymentMethod).WithMessage("Invalid payment method. Use Cash, BankTransfer or Card.");
        });

        // Goods documents carry lines and ignore Amount.
        When(x => x.Type is not (DocumentType.PayIn or DocumentType.PayOut), () =>
        {
            RuleFor(x => x.Lines)
                .NotEmpty().WithErrorCode(DocumentErrorCodes.LinesRequired).WithMessage("At least one line is required");
            RuleForEach(x => x.Lines).SetValidator(new CreateDocumentLineRequestValidator());
        });
    }
}

public class CreateDocumentLineRequestValidator : AbstractValidator<CreateDocumentLineRequest>
{
    public CreateDocumentLineRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty().WithErrorCode(DocumentErrorCodes.LineProductRequired);
        RuleFor(x => x.Quantity).GreaterThan(0).WithErrorCode(DocumentErrorCodes.LineQuantityPositive);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0).WithErrorCode(DocumentErrorCodes.LinePriceNonNegative);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100).WithErrorCode(DocumentErrorCodes.DiscountRange);
    }
}
