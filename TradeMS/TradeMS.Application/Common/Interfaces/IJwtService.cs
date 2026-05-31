using TradeMS.Domain.Entities;

namespace TradeMS.Application.Common.Interfaces;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    (bool isValid, string email) ValidateRefreshToken(string token);
}
