namespace TradeMS.Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid? UserId { get; }
    Guid? CompanyId { get; }
    string? UserEmail { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
}
