using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using TradeMS.Application.Common.Interfaces;
using TradeMS.Infrastructure.Persistence;
using TradeMS.Infrastructure.Services;

namespace TradeMS.Infrastructure;

public static class DependencyInjection
{
    private static readonly string[] PlaceholderMarkers =
    [
        "super-secret", "change-in-production", "change_me", "changeme", "change-me", "your-", "your_", "placeholder", "test-secret"
    ];

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config, IHostEnvironment env)
    {
        services.AddDbContext<AppDbContext>(opts =>
            opts.UseNpgsql(config.GetConnectionString("DefaultConnection")));

        services.AddDbContextFactory<AppDbContext>(opts =>
            opts.UseNpgsql(config.GetConnectionString("DefaultConnection")),
            ServiceLifetime.Scoped);

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());
        services.AddScoped<IJwtService, JwtService>();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IAuditLogger, AuditLogger>();

        var jwtSecret = config["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(jwtSecret) || jwtSecret.Length < 32)
            throw new InvalidOperationException(
                "Jwt:Secret is not configured or is shorter than 32 characters. " +
                "Provide a strong secret via the Jwt__Secret environment variable.");

        if (!env.IsDevelopment() && PlaceholderMarkers.Any(m => jwtSecret.Contains(m, StringComparison.OrdinalIgnoreCase)))
            throw new InvalidOperationException(
                "Jwt:Secret looks like a placeholder value. " +
                "Provide a strong random secret via the Jwt__Secret environment variable.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opts =>
            {
                opts.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = config["Jwt:Issuer"],
                    ValidAudience = config["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSecret)),
                    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 },
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            });

        services.AddAuthorization(opts =>
        {
            opts.AddPolicy("Admin", policy =>
                policy.RequireRole("Admin"));
        });

        return services;
    }
}
