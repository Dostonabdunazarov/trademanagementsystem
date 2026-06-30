using FluentValidation;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Documents.Commands.CreateDocument;

public class CreateDocumentCommandValidator : AbstractValidator<CreateDocumentCommand>
{
    public CreateDocumentCommandValidator()
    {
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.BranchId).NotEmpty();
        RuleFor(x => x.CurrencyId).NotEmpty();
        RuleFor(x => x.ExchangeRate).GreaterThan(0);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100);

        // Payment documents (PayIn/PayOut) carry no lines — the moved money is in Amount.
        When(x => x.Type is DocumentType.PayIn or DocumentType.PayOut, () =>
        {
            RuleFor(x => x.Amount)
                .NotNull().WithMessage("Amount is required for payment documents")
                .GreaterThan(0).WithMessage("Payment amount must be greater than zero");
            RuleFor(x => x.CounterpartyId)
                .NotNull().WithMessage("Counterparty is required for payment documents");
            RuleFor(x => x.PaymentMethod)
                .Must(pm => string.IsNullOrEmpty(pm) || Enum.TryParse<PaymentMethod>(pm, true, out _))
                .WithMessage("Invalid payment method. Use Cash, BankTransfer or Card.");
        });

        // Goods documents carry lines and ignore Amount.
        When(x => x.Type is not (DocumentType.PayIn or DocumentType.PayOut), () =>
        {
            RuleFor(x => x.Lines)
                .NotEmpty().WithMessage("At least one line is required");
            RuleForEach(x => x.Lines).SetValidator(new CreateDocumentLineRequestValidator());
        });
    }
}

public class CreateDocumentLineRequestValidator : AbstractValidator<CreateDocumentLineRequest>
{
    public CreateDocumentLineRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Quantity).GreaterThan(0);
        RuleFor(x => x.Price).GreaterThanOrEqualTo(0);
        RuleFor(x => x.DiscountPercent).InclusiveBetween(0, 100);
    }
}
