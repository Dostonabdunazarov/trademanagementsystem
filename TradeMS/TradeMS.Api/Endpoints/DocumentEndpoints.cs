using System.Security.Claims;
using MediatR;
using TradeMS.Api.Infrastructure;
using TradeMS.Application.Features.Documents.Commands.CancelDocument;
using TradeMS.Application.Features.Documents.Commands.ConfirmDocument;
using TradeMS.Application.Features.Documents.Commands.CreateDocument;
using TradeMS.Application.Features.Documents.Commands.DeleteDocument;
using TradeMS.Application.Features.Documents.Commands.UpdateDocument;
using TradeMS.Application.Features.Documents.DTOs;
using TradeMS.Application.Features.Documents.Queries.GetDocumentById;
using TradeMS.Application.Features.Documents.Queries.GetDocuments;
using TradeMS.Domain.Enums;

namespace TradeMS.Api.Endpoints;

public static class DocumentEndpoints
{
    public static IEndpointRouteBuilder MapDocumentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/documents")
            .WithTags("Documents")
            .RequireAuthorization();

        group.MapGet("/", async (
            string? type,
            DateOnly? dateFrom,
            DateOnly? dateTo,
            string? status,
            Guid? branchId,
            string? search,
            int? page,
            int? pageSize,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var result = await mediator.Send(new GetDocumentsQuery(
                user.GetCompanyId(), type, dateFrom, dateTo,
                ClaimsPrincipalExtensions.ClampPage(page),
                ClaimsPrincipalExtensions.ClampPageSize(pageSize),
                status, user.BranchScope(branchId), search));
            return Results.Ok(result);
        })
        .WithSummary("Get documents list (paginated, filterable by type/date/status, search by number or counterparty)");

        group.MapGet("/{id:long}", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var result = await mediator.Send(new GetDocumentByIdQuery(id, user.GetCompanyId(), user.BranchScope()));
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithSummary("Get document by ID");

        group.MapPost("/", async (CreateDocumentRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            // Admin выбирает филиал документа в UI (или берётся его филиал из токена, как для касс);
            // остальные всегда создают в своём филиале.
            var branchId = user.IsAdmin()
                ? (req.BranchId is { } b && b != Guid.Empty ? b : user.GetTokenBranchId())
                : user.BranchScope();
            if (branchId is null || branchId == Guid.Empty)
                return Results.BadRequest("BranchId is required for Admin");

            if (!Enum.TryParse<DocumentType>(req.Type, true, out var docType))
                return Results.BadRequest($"Unknown document type: {req.Type}");

            var result = await mediator.Send(new CreateDocumentCommand(
                user.GetCompanyId(), branchId.Value, user.GetUserId(),
                docType, req.Date, req.CounterpartyId,
                req.CurrencyId, req.ExchangeRate, req.DiscountPercent,
                req.Note, req.Lines ?? [], req.Amount, req.PaymentMethod, req.AccountId));

            return Results.Created($"/documents/{result.Id}", result);
        })
        .WithSummary("Create document draft");

        group.MapPut("/{id:long}", async (long id, UpdateDocumentRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var result = await mediator.Send(new UpdateDocumentCommand(
                id, user.GetCompanyId(), user.BranchScope(), req.Date, req.CounterpartyId,
                req.CurrencyId, req.ExchangeRate, req.DiscountPercent,
                req.Note, req.Lines ?? [], req.Amount, req.PaymentMethod, req.AccountId));
            return Results.Ok(result);
        })
        .WithSummary("Update document draft (goods: lines; payments: amount/paymentMethod/accountId)");

        group.MapPost("/{id:long}/confirm", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var result = await mediator.Send(new ConfirmDocumentCommand(id, user.GetCompanyId(), user.BranchScope()));
            return Results.Ok(result);
        })
        .WithSummary("Confirm document (updates stock and counterparty balance)");

        group.MapPost("/{id:long}/cancel", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var result = await mediator.Send(new CancelDocumentCommand(id, user.GetCompanyId(), user.BranchScope()));
            return Results.Ok(result);
        })
        // Отмена проведённого документа откатывает склад и деньги — не для кассира.
        .RequireAuthorization(p => p.RequireRole("Admin", "Manager"))
        .WithSummary("Cancel a confirmed document (reverses stock, balances and payment)");

        group.MapDelete("/{id:long}", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            await mediator.Send(new DeleteDocumentCommand(id, user.GetCompanyId(), user.BranchScope()));
            return Results.NoContent();
        })
        .WithSummary("Delete document (Draft only)");

        return app;
    }
}
