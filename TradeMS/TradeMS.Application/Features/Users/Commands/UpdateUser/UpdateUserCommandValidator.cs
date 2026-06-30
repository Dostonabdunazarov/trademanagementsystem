using FluentValidation;

namespace TradeMS.Application.Features.Users.Commands.UpdateUser;

public class UpdateUserCommandValidator : AbstractValidator<UpdateUserCommand>
{
    public UpdateUserCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.CompanyId).NotEmpty();
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        // Password is optional on update; enforce strength only when a new one is supplied.
        When(x => !string.IsNullOrEmpty(x.Password), () =>
        {
            RuleFor(x => x.Password!)
                .MinimumLength(8).WithMessage("Password must be at least 8 characters long.");
        });
    }
}
