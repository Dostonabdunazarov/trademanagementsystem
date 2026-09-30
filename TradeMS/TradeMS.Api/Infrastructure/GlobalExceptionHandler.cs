using System.Data.Common;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        // Порядок важен: специальные типы — раньше базовых (AuthenticationFailedException
        // наследует UnauthorizedAccessException, BusinessException — InvalidOperationException).
        var (status, title, code) = ex switch
        {
            ForbiddenAccessException fe      => (StatusCodes.Status403Forbidden, "Forbidden", fe.Code),
            AuthenticationFailedException ae => (StatusCodes.Status401Unauthorized, "Unauthorized", ae.Code),
            UnauthorizedAccessException      => (StatusCodes.Status401Unauthorized, "Unauthorized", (string?)null),
            ValidationException              => (StatusCodes.Status400BadRequest, "Validation failed", "validation"),
            KeyNotFoundException             => (StatusCodes.Status404NotFound, "Not found", null),
            BusinessException be             => (StatusCodes.Status409Conflict, "Conflict", be.Code),
            DbUpdateConcurrencyException     => (StatusCodes.Status409Conflict, "Conflict", ErrorCodes.ConcurrencyConflict),
            DbUpdateException { InnerException: DbException { SqlState: "23505" } }
                                             => (StatusCodes.Status409Conflict, "Conflict", ErrorCodes.ConcurrencyConflict),
            BadHttpRequestException bre      => (bre.StatusCode, "Bad request", null),
            // Прочие исключения (в том числе InvalidOperationException из EF/LINQ) — внутренние
            // ошибки: 500 без текста, чтобы не раскрывать детали реализации клиенту.
            _ => (StatusCodes.Status500InternalServerError, "Internal server error", null)
        };

        if (status >= 500)
            logger.LogError(ex, "Unhandled exception");
        else
            logger.LogWarning("{Status} {Method} {Path}: {Type}: {Message}",
                status, ctx.Request.Method, ctx.Request.Path, ex.GetType().Name, ex.Message);

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
            // Текст отдаём только для ожидаемых ошибок; внутренний текст 500-й — в логе и аудите.
            Detail = status == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred"
                : ex.Message
        };

        // Машиночитаемые код и параметры — UI строит по ним текст на языке интерфейса.
        if (code is not null)
            problem.Extensions["code"] = code;

        switch (ex)
        {
            case BusinessException be:
                problem.Extensions["args"] = be.Args;
                break;
            case ValidationException ve:
                var errors = ve.Errors
                    .Select(e => new { field = e.PropertyName, code = e.ErrorCode, message = e.ErrorMessage })
                    .ToList();
                problem.Detail = string.Join("; ", errors.Select(e => e.message).Distinct());
                problem.Extensions["errors"] = errors;
                break;
        }

        ctx.Response.StatusCode = status;
        await ctx.Response.WriteAsJsonAsync(problem, ct);

        return true;
    }
}
