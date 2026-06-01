using MediatR;

namespace TradeMS.Application.Features.AuditLogs.Queries;

public record GetAuditLogsQuery(
    Guid CompanyId,
    Guid? UserId,
    string? Action,
    DateTime? DateFrom,
    DateTime? DateTo,
    bool? Success,
    int Page,
    int PageSize
) : IRequest<GetAuditLogsResult>;

public record GetAuditLogsResult(List<AuditLogDto> Items, int TotalCount);

public record AuditLogDto(
    long Id,
    Guid? UserId,
    string? UserEmail,
    string Action,
    string? EntityType,
    string? EntityId,
    string? Details,
    bool Success,
    string? ErrorMessage,
    string? IpAddress,
    string? UserAgent,
    DateTime CreatedAt
);
