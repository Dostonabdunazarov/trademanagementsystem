using FluentValidation;

namespace TradeMS.Application.Features.Products.Commands.CreateProductGroup;

public class CreateProductGroupCommandValidator : AbstractValidator<CreateProductGroupCommand>
{
    public CreateProductGroupCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.CompanyId).NotEmpty();
    }
}
