using System.Security.Claims;
using MediatR;
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
            int? page,
            int? pageSize,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var role = user.FindFirstValue(ClaimTypes.Role);

            // Non-admin users can only see their own branch
            var effectiveBranchId = role == "Admin"
                ? branchId
                : TryGetBranchId(user);

            var result = await mediator.Send(new GetDocumentsQuery(
                companyId, type, dateFrom, dateTo,
                Math.Max(1, page ?? 1),
                Math.Max(1, pageSize ?? 20),
                status, effectiveBranchId));
            return Results.Ok(result);
        })
        .WithSummary("Get documents list (paginated, filterable by type/date)");

        group.MapGet("/{id:long}", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetDocumentByIdQuery(id, companyId));
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithSummary("Get document by ID");

        group.MapPost("/", async (CreateDocumentRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var userId    = GetUserId(user);
            var role      = user.FindFirstValue(ClaimTypes.Role);

            Guid branchId;
            if (role == "Admin")
            {
                if (req.BranchId is null || req.BranchId == Guid.Empty)
                    return Results.BadRequest("BranchId is required for Admin");
                branchId = req.BranchId.Value;
            }
            else
            {
                var tokenBranch = TryGetBranchId(user);
                if (tokenBranch is null)
                    return Results.BadRequest("User is not assigned to a branch");
                branchId = tokenBranch.Value;
            }

            if (!Enum.TryParse<DocumentType>(req.Type, true, out var docType))
                return Results.BadRequest($"Unknown document type: {req.Type}");

            var result = await mediator.Send(new CreateDocumentCommand(
                companyId, branchId, userId,
                docType, req.Date, req.CounterpartyId,
                req.CurrencyId, req.ExchangeRate, req.DiscountPercent,
                req.Note, req.Lines, req.Amount, req.PaymentMethod, req.AccountId));

            return Results.Created($"/documents/{result.Id}", result);
        })
        .WithSummary("Create document draft");

        group.MapPut("/{id:long}", async (long id, UpdateDocumentRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var role = user.FindFirstValue(ClaimTypes.Role);
            var branchId = role == "Admin" ? null : TryGetBranchId(user);

            var result = await mediator.Send(new UpdateDocumentCommand(
                id, companyId, branchId, req.Date, req.CounterpartyId,
                req.CurrencyId, req.ExchangeRate, req.DiscountPercent,
                req.Note, req.Lines));
            return Results.Ok(result);
        })
        .WithSummary("Update document draft");

        group.MapPost("/{id:long}/confirm", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var role = user.FindFirstValue(ClaimTypes.Role);
            var branchId = role == "Admin" ? null : TryGetBranchId(user);

            var result = await mediator.Send(new ConfirmDocumentCommand(id, companyId, branchId));
            return Results.Ok(result);
        })
        .WithSummary("Confirm document (updates stock and counterparty balance)");

        group.MapPost("/{id:long}/cancel", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var role = user.FindFirstValue(ClaimTypes.Role);
            var branchId = role == "Admin" ? null : TryGetBranchId(user);

            var result = await mediator.Send(new CancelDocumentCommand(id, companyId, branchId));
            return Results.Ok(result);
        })
        .WithSummary("Cancel a confirmed document (reverses stock, balances and payment)");

        group.MapDelete("/{id:long}", async (long id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var role = user.FindFirstValue(ClaimTypes.Role);
            var branchId = role == "Admin" ? null : TryGetBranchId(user);

            await mediator.Send(new DeleteDocumentCommand(id, companyId, branchId));
            return Results.NoContent();
        })
        .WithSummary("Delete document (Draft only)");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }

    private static Guid? TryGetBranchId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("branch_id");
        return !string.IsNullOrEmpty(value) ? Guid.Parse(value) : null;
    }

    private static Guid GetUserId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? user.FindFirstValue("sub")
                 ?? throw new UnauthorizedAccessException("user id claim missing");
        return Guid.Parse(value);
    }
}
