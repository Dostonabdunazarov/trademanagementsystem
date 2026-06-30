using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Auth.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler(IAppDbContext db, IJwtService jwtService, IAuditLogger auditLogger)
    : IRequestHandler<LoginCommand, LoginResponse>
{
    private const int MaxFailedAttempts = 5;
    private const int LockoutMinutes = 15;

    public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await db.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email == request.Email, cancellationToken);

        if (user is null)
        {
            await auditLogger.LogAsync(AuditActions.LoginFail, success: false,
                overrideEmail: request.Email,
                errorMessage: "User not found",
                cancellationToken: cancellationToken);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        if (!user.IsActive)
        {
            await auditLogger.LogAsync(AuditActions.LoginInactive, success: false,
                overrideUserId: user.Id, overrideEmail: user.Email,
                overrideCompanyId: user.CompanyId,
                errorMessage: "Account is inactive",
                cancellationToken: cancellationToken);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        if (user.LockoutUntil.HasValue && user.LockoutUntil > DateTime.UtcNow)
        {
            await auditLogger.LogAsync(AuditActions.LoginLocked, success: false,
                overrideUserId: user.Id, overrideEmail: user.Email,
                overrideCompanyId: user.CompanyId,
                errorMessage: $"Locked until {user.LockoutUntil:u}",
                cancellationToken: cancellationToken);
            throw new UnauthorizedAccessException($"Account is locked. Try again after {user.LockoutUntil:HH:mm} UTC");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            user.FailedLoginCount++;
            if (user.FailedLoginCount >= MaxFailedAttempts)
                user.LockoutUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);

            await db.SaveChangesAsync(cancellationToken);

            await auditLogger.LogAsync(AuditActions.LoginFail, success: false,
                overrideUserId: user.Id, overrideEmail: user.Email,
                overrideCompanyId: user.CompanyId,
                errorMessage: $"Invalid password (attempt {user.FailedLoginCount})",
                cancellationToken: cancellationToken);
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        user.FailedLoginCount = 0;
        user.LockoutUntil = null;
        var accessToken = jwtService.GenerateAccessToken(user);
        var refreshToken = jwtService.GenerateRefreshToken();
        user.RefreshToken = jwtService.HashRefreshToken(refreshToken);
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await db.SaveChangesAsync(cancellationToken);

        await auditLogger.LogAsync(AuditActions.LoginSuccess,
            overrideUserId: user.Id, overrideEmail: user.Email,
            overrideCompanyId: user.CompanyId,
            cancellationToken: cancellationToken);

        var userDto = new AuthUserDto(user.Id, user.FullName, user.Email, user.Role.ToString(), user.CompanyId, user.Company.Name, user.BranchId);
        return new LoginResponse(accessToken, refreshToken, userDto);
    }
}
