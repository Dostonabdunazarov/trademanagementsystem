using MediatR;
using TradeMS.Application.Features.Auth.DTOs;

namespace TradeMS.Application.Features.Auth.Commands.RefreshToken;

public record RefreshTokenCommand(string RefreshToken) : IRequest<LoginResponse>;
