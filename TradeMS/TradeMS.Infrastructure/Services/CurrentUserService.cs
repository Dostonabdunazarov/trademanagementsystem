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
            var value = httpContextAccessor.HttpContext?.User.FindFirstValue("company_id");
            return Guid.TryParse(value, out var id) ? id : null;
        }
    }

    public string? UserEmail =>
        httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.Email);

    // RemoteIpAddress уже содержит адрес клиента: UseForwardedHeaders разбирает X-Forwarded-For
    // только от доверенных прокси. Сырой заголовок читать нельзя — его подделывает клиент.
    public string? IpAddress
    {
        get
        {
            var ip = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ip is null) return null;
            return (ip.IsIPv4MappedToIPv6 ? ip.MapToIPv4() : ip).ToString();
        }
    }

    public string? UserAgent =>
        httpContextAccessor.HttpContext?.Request.Headers["User-Agent"].ToString();
}
