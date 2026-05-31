namespace TradeMS.Application.Features.Branches.DTOs;

public record BranchDto(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? Address
);
