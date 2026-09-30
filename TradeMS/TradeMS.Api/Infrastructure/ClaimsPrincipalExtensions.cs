using System.Security.Claims;
using TradeMS.Application.Common.Exceptions;

namespace TradeMS.Api.Infrastructure;

/// <summary>Чтение идентичности и скоупа (компания/филиал/роль) из JWT-claims.</summary>
public static class ClaimsPrincipalExtensions
{
    public const int MaxPageSize = 200;

    public static Guid GetCompanyId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id");
        return Guid.TryParse(value, out var id)
            ? id
            : throw new UnauthorizedAccessException("company_id claim missing");
    }

    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        return Guid.TryParse(value, out var id)
            ? id
            : throw new UnauthorizedAccessException("user id claim missing");
    }

    public static bool IsAdmin(this ClaimsPrincipal user) => user.IsInRole("Admin");

    /// <summary>Филиал из токена или null, если пользователь не привязан к филиалу.</summary>
    public static Guid? GetTokenBranchId(this ClaimsPrincipal user)
        => Guid.TryParse(user.FindFirstValue("branch_id"), out var id) ? id : null;

    /// <summary>
    /// Эффективный фильтр по филиалу. Admin видит всю компанию и может сузить выборку
    /// параметром <paramref name="requested"/>. Остальные роли всегда ограничены своим филиалом
    /// из токена — параметр запроса игнорируется. Не-админ без филиала не получает доступа
    /// (иначе null означал бы «все филиалы»).
    /// </summary>
    public static Guid? BranchScope(this ClaimsPrincipal user, Guid? requested = null)
    {
        if (user.IsAdmin())
            return requested;

        return user.GetTokenBranchId()
            ?? throw new ForbiddenAccessException("User is not assigned to a branch", ErrorCodes.BranchNotAssigned);
    }

    public static int ClampPage(int? page) => Math.Max(1, page ?? 1);

    public static int ClampPageSize(int? pageSize, int fallback = 20)
        => Math.Clamp(pageSize ?? fallback, 1, MaxPageSize);
}
