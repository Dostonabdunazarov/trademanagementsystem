using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using TradeMS.Application.Common.Interfaces;

namespace TradeMS.Infrastructure.Services;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    public Guid? UserId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public Guid? CompanyId
    {
        get
        {
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue("companyId");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? UserEmail =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);

    public string? IpAddress
    {
        get
        {
            var ctx = httpContextAccessor.HttpContext;
            if (ctx is null) return null;
            var forwarded = ctx.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwarded))
                return forwarded.Split(',')[0].Trim();
            return ctx.Connection.RemoteIpAddress?.ToString();
        }
    }

    public string? UserAgent =>
        httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString();
}
