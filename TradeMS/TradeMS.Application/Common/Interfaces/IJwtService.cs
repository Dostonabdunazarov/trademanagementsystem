using TradeMS.Domain.Entities;

namespace TradeMS.Application.Common.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();

    /// <summary>Hashes an opaque refresh token for at-rest storage (the raw token is never persisted).</summary>
    string HashRefreshToken(string token);
}
