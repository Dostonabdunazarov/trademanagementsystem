using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using TradeMS.Application.Common.Exceptions;
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
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            KeyNotFoundException => (StatusCodes.Status404NotFound, "Not found"),
            InvalidOperationException => (StatusCodes.Status409Conflict, "Conflict"),
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

        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            // Внутренний текст 500-й ошибки клиенту не отдаём — он есть в логе и аудите.
            Detail = status == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred"
                : ex.Message
        };

        // Машиночитаемые код и параметры — UI строит по ним текст на языке интерфейса.
        switch (ex)
        {
            case BusinessException be:
                problem.Extensions["code"] = be.Code;
                problem.Extensions["args"] = be.Args;
                break;
            case ValidationException ve:
                var errors = ve.Errors
                    .Select(e => new { field = e.PropertyName, code = e.ErrorCode, message = e.ErrorMessage })
                    .ToList();
                problem.Title = "Validation failed";
                problem.Detail = string.Join("; ", errors.Select(e => e.message).Distinct());
                problem.Extensions["code"] = "validation";
                problem.Extensions["errors"] = errors;
                break;
        }

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(problem, ct);

        return true;
    }
}
