using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;

namespace TradeMS.Application.Features.Auth.Commands.Logout;

/// <summary>Revokes the user's refresh token so it can no longer be used to mint access tokens.</summary>
public class LogoutCommandHandler(IAppDbContext db) : IRequestHandler<LogoutCommand>
{
    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user is null)
            return; // nothing to revoke

        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
        await db.SaveChangesAsync(cancellationToken);
    }
}
