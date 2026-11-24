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
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new AuthenticationFailedException("Invalid or expired refresh token", ErrorCodes.SessionExpired);

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
        var userId = user.Id;
        var newHash = jwtService.HashRefreshToken(newRefreshToken);
        var newExpiry = DateTime.UtcNow.AddDays(7);
        var rotated = await db.Users
            .Where(u => u.Id == userId && u.RefreshToken == tokenHash)
            .ExecuteUpdateAsync(s => s
                .SetProperty(u => u.RefreshToken, newHash)
                .SetProperty(u => u.RefreshTokenExpiry, newExpiry),
                cancellationToken);
        if (rotated == 0)
            throw new AuthenticationFailedException("Invalid or expired refresh token", ErrorCodes.SessionExpired);

        var userDto = new AuthUserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.CompanyId, user.Company.Name, user.BranchId);
        return new LoginResponse(accessToken, newRefreshToken, userDto);
    }
}
