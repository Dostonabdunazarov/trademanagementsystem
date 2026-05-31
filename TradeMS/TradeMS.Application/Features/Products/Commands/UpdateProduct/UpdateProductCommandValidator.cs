using FluentValidation;

namespace TradeMS.Application.Features.Products.Commands.UpdateProduct;

public class UpdateProductCommandValidator : AbstractValidator<UpdateProductCommand>
{
    public UpdateProductCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(300);
        RuleFor(x => x.PriceSell).GreaterThanOrEqualTo(0);
        RuleFor(x => x.PriceBuy).GreaterThanOrEqualTo(0);
        RuleFor(x => x.CurrencyId).NotEmpty();
        RuleFor(x => x.Sku).MaximumLength(100).When(x => x.Sku != null);
        RuleFor(x => x.Barcode).MaximumLength(100).When(x => x.Barcode != null);
    }
}
