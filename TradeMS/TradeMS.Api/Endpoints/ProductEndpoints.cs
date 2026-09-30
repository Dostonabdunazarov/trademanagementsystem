using System.Security.Claims;
using MediatR;
using TradeMS.Api.Infrastructure;
using TradeMS.Application.Features.Products.Commands.CreateProduct;
using TradeMS.Application.Features.Products.Commands.DeleteProduct;
using TradeMS.Application.Features.Products.Commands.UpdateProduct;
using TradeMS.Application.Features.Products.DTOs;
using TradeMS.Application.Features.Products.Queries.GetProductById;
using TradeMS.Application.Features.Products.Queries.GetProducts;

namespace TradeMS.Api.Endpoints;

public static class ProductEndpoints
{
    public static IEndpointRouteBuilder MapProductEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/products")
            .WithTags("Products")
            .RequireAuthorization();

        group.MapGet("/", async (
            string? search,
            Guid? groupId,
            int? page,
            int? pageSize,
            ClaimsPrincipal user,
            IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(
                new GetProductsQuery(companyId, search, groupId, ClaimsPrincipalExtensions.ClampPage(page), ClaimsPrincipalExtensions.ClampPageSize(pageSize)));
            return Results.Ok(result);
        })
        .WithSummary("Get products list (paginated)");

        group.MapGet("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new GetProductByIdQuery(id, companyId));
            return Results.Ok(result);
        })
        .WithSummary("Get product by id");

        group.MapPost("/", async (CreateProductRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new CreateProductCommand(
                companyId, req.GroupId, req.Name, req.Sku, req.Barcode,
                req.Unit, req.PriceSell, req.PriceBuy, req.CurrencyId));
            return Results.Created($"/products/{result.Id}", result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Create product");

        group.MapPut("/{id:guid}", async (Guid id, UpdateProductRequest req, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            var result = await mediator.Send(new UpdateProductCommand(
                id, companyId, req.GroupId, req.Name, req.Sku, req.Barcode,
                req.Unit, req.PriceSell, req.PriceBuy, req.CurrencyId, req.IsActive));
            return Results.Ok(result);
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Update product");

        group.MapDelete("/{id:guid}", async (Guid id, ClaimsPrincipal user, IMediator mediator) =>
        {
            var companyId = GetCompanyId(user);
            await mediator.Send(new DeleteProductCommand(id, companyId));
            return Results.NoContent();
        })
        .RequireAuthorization(p => p.RequireRole("Admin"))
        .WithSummary("Delete product");

        return app;
    }

    private static Guid GetCompanyId(ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("company_id")
            ?? throw new UnauthorizedAccessException("company_id claim missing");
        return Guid.Parse(value);
    }
}
