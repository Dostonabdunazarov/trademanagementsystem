using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using TradeMS.Application.Features.AuditLogs.Queries;

namespace TradeMS.Api.Endpoints;

public static class AuditLogEndpoints
{
    public static IEndpointRouteBuilder MapAuditLogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/audit-logs").WithTags("AuditLogs").RequireAuthorization("Admin");

        group.MapGet("/", async (
            [FromQuery] Guid? userId,
            [FromQuery] string? action,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] bool? success,
            [FromQuery] int page,
            [FromQuery] int pageSize,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetAuditLogsQuery(
                companyId, userId, action, dateFrom, dateTo, success,
                page < 1 ? 1 : page,
                pageSize < 1 ? 20 : pageSize > 500 ? 500 : pageSize));
            return Results.Ok(result);
        })
        .WithSummary("Get audit logs (Admin only)");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
