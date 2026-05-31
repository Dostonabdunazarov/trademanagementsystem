namespace TradeMS.Application.Features.Users.DTOs;

public record UserDto(
    Guid Id,
    Guid CompanyId,
    Guid? BranchId,
    string FullName,
    string Email,
    string Role,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateUserRequest(
    string FullName,
    string Email,
    string Password,
    string Role,
    Guid? BranchId
);

public record UpdateUserRequest(
    string FullName,
    string Role,
    string? Password,
    bool IsActive
);
