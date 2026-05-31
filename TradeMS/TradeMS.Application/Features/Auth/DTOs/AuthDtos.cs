namespace TradeMS.Application.Features.Auth.DTOs;

public record LoginRequest(string Email, string Password);
public record AuthUserDto(Guid Id, string FullName, string Email, string Role, Guid CompanyId, Guid? BranchId);
public record LoginResponse(string AccessToken, string RefreshToken, AuthUserDto User, string TokenType = "Bearer");
public record RefreshTokenRequest(string RefreshToken);
