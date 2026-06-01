using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Domain.Entities;

namespace TradeMS.Api.Infrastructure;

public class GlobalExceptionHandler(
    ILogger<GlobalExceptionHandler> logger,
    IServiceProvider serviceProvider) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        logger.LogError(ex, "Unhandled exception");

        var (status, title) = ex switch
        {
            UnauthorizedAccessException uae when uae.Message.StartsWith("Access to this document")
                => (StatusCodes.Status403Forbidden, "Forbidden"),
            UnauthorizedAccessException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            ValidationException ve => (StatusCodes.Status400BadRequest, ve.Message),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Not found"),
            _ => (StatusCodes.Status500InternalServerError, "Internal server error")
        };

        try
        {
            using var scope = serviceProvider.CreateScope();
            var auditLogger = scope.ServiceProvider.GetRequiredService<IAuditLogger>();

            if (status == StatusCodes.Status500InternalServerError)
            {
                await auditLogger.LogAsync(AuditActions.ErrorServer, success: false,
                    errorMessage: ex.Message,
                    cancellationToken: CancellationToken.None);
            }
            else if (status == StatusCodes.Status403Forbidden)
            {
                await auditLogger.LogAsync(AuditActions.ErrorForbidden, success: false,
                    errorMessage: ex.Message,
                    cancellationToken: CancellationToken.None);
            }
        }
        catch (Exception auditEx)
        {
            logger.LogWarning(auditEx, "Audit logging failed for unhandled exception");
        }

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = ex.Message
        }, ct);

        return true;
    }
}
