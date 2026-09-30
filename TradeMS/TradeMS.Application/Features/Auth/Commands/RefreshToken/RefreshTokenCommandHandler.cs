using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Auth.DTOs;

namespace TradeMS.Application.Features.Auth.Commands.RefreshToken;

public class RefreshTokenCommandHandler(IAppDbContext db, IJwtService jwtService) : IRequestHandler<RefreshTokenCommand, LoginResponse>
{
    public async Task<LoginResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = jwtService.HashRefreshToken(request.RefreshToken);

        var user = await db.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u =>
                u.RefreshToken == tokenHash &&
                u.RefreshTokenExpiry > DateTime.UtcNow &&
                u.IsActive &&
                u.DeletedAt == null,
                cancellationToken)
            ?? throw new AuthenticationFailedException("Invalid or expired refresh token", ErrorCodes.SessionExpired);

        var accessToken = jwtService.GenerateAccessToken(user);
        var newRefreshToken = jwtService.GenerateRefreshToken();

        // Rotate: persist only the hash of the new token.
        user.RefreshToken = jwtService.HashRefreshToken(newRefreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await db.SaveChangesAsync(cancellationToken);

        var userDto = new AuthUserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.CompanyId, user.Company.Name, user.BranchId);
        return new LoginResponse(accessToken, newRefreshToken, userDto);
    }
}
