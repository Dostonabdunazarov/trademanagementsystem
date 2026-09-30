using MediatR;
using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Application.Features.Auth.DTOs;
using TradeMS.Domain.Entities;

namespace TradeMS.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler(IAppDbContext db, IJwtService jwtService, IAuditLogger auditLogger)
    : IRequestHandler<LoginCommand, LoginResponse>
{
    private const int MaxFailedAttempts = 5;
    private const int LockoutMinutes = 15;

    // Хэш заведомо неверного пароля: для несуществующего email тоже выполняем BCrypt,
    // чтобы по времени ответа нельзя было понять, есть ли такой пользователь.
    private static readonly string DummyHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString());

    public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var user = await db.Users
            .Include(u => u.Company)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == email && u.DeletedAt == null, cancellationToken);

        if (user is null)
        {
            BCrypt.Net.BCrypt.Verify(request.Password, DummyHash);
            await auditLogger.LogAsync(AuditActions.LoginFail, success: false,
                overrideEmail: email,
                errorMessage: "User not found",
                cancellationToken: cancellationToken);
            throw InvalidCredentials();
        }

        // Все отказы отдаются клиенту одинаково — причина (нет пользователя, выключен,
        // заблокирован, неверный пароль) видна только в аудите.
        if (!user.IsActive)
        {
            await auditLogger.LogAsync(AuditActions.LoginInactive, success: false,
                overrideUserId: user.Id, overrideEmail: user.Email,
                overrideCompanyId: user.CompanyId,
                errorMessage: "Account is inactive",
                cancellationToken: cancellationToken);
            throw InvalidCredentials();
        }

        if (user.LockoutUntil.HasValue && user.LockoutUntil > DateTime.UtcNow)
        {
            await auditLogger.LogAsync(AuditActions.LoginLocked, success: false,
                overrideUserId: user.Id, overrideEmail: user.Email,
                overrideCompanyId: user.CompanyId,
                errorMessage: $"Locked until {user.LockoutUntil:u}",
                cancellationToken: cancellationToken);
            throw InvalidCredentials();
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            // Атомарный инкремент в БД: параллельные попытки не перетирают счётчик друг друга
            // (read-modify-write в памяти позволял обойти лимит пачкой одновременных запросов).
            var userId = user.Id;
            await db.Users
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.FailedLoginCount, u => u.FailedLoginCount + 1),
                    cancellationToken);

            var lockoutUntil = DateTime.UtcNow.AddMinutes(LockoutMinutes);
            await db.Users
                .Where(u => u.Id == userId && u.FailedLoginCount >= MaxFailedAttempts)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockoutUntil, lockoutUntil), cancellationToken);

            await auditLogger.LogAsync(AuditActions.LoginFail, success: false,
                overrideUserId: user.Id, overrideEmail: user.Email,
                overrideCompanyId: user.CompanyId,
                errorMessage: "Invalid password",
                cancellationToken: cancellationToken);
            throw InvalidCredentials();
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

    private static AuthenticationFailedException InvalidCredentials() => new("Invalid credentials");
}
