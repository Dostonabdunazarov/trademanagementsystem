using Microsoft.EntityFrameworkCore;
using TradeMS.Application.Common.Exceptions;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;
using TradeMS.Domain.Enums;

namespace TradeMS.Application.Features.Users;

internal static class UserRules
{
    /// <summary>Email хранится и сравнивается в нижнем регистре: «Admin@x» и «admin@x» — один адрес.</summary>
    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    /// <summary>
    /// Manager и Cashier работают только в своём филиале, поэтому филиал обязателен;
    /// филиал должен принадлежать компании. Admin может быть без филиала.
    /// </summary>
    public static async Task EnsureBranchAsync(
        IAppDbContext db, Guid companyId, UserRole role, Guid? branchId, CancellationToken ct)
    {
        if (branchId is null)
        {
            if (role != UserRole.Admin)
                throw new BusinessException(ErrorCodes.BranchRequiredForRole,
                    "Manager and Cashier must be assigned to a branch");
            return;
        }

        if (!await db.Branches.AnyAsync(b => b.Id == branchId && b.CompanyId == companyId, ct))
            throw new BusinessException(DocumentErrorCodes.InvalidBranch, "Branch not found");
    }

    /// <summary>Компания не должна остаться без активного администратора.</summary>
    public static async Task EnsureAnotherActiveAdminAsync(IAppDbContext db, User user, CancellationToken ct)
    {
        var othersExist = await db.Users.AnyAsync(u =>
            u.CompanyId == user.CompanyId && u.Id != user.Id &&
            u.Role == UserRole.Admin && u.IsActive && u.DeletedAt == null, ct);

        if (!othersExist)
            throw new BusinessException(ErrorCodes.LastAdmin, "The company must keep at least one active admin");
    }

    /// <summary>Отзыв refresh-токена: следующий refresh не пройдёт, пользователь перелогинится.</summary>
    public static void RevokeSessions(User user)
    {
        user.RefreshToken = null;
        user.RefreshTokenExpiry = null;
    }
}
