
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly IConfiguration _configuration;

    public JwtTokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public AuthResponse GenerateToken(User user)
    {
        var keyString = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException(
                "JWT signing key is not configured.");

        var keyBytes = Convert.FromBase64String(keyString);

        if (keyBytes.Length < 32)
        {
            throw new InvalidOperationException(
                "JWT signing key must contain at least 32 bytes.");
        }

        var issuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException(
                "JWT issuer is not configured.");

        var audience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException(
                "JWT audience is not configured.");

        var expirationMinutes = _configuration.GetValue<int>(
            "Jwt:AccessTokenExpirationMinutes");

        if (expirationMinutes <= 0)
        {
            throw new InvalidOperationException(
                "JWT expiration must be greater than zero.");
        }

        var expiresAt = DateTime.UtcNow.AddMinutes(
            expirationMinutes);

        var claims = new List<Claim>
{
    new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
    new(ClaimTypes.Name, user.FullName),
    new(ClaimTypes.Email, user.Email)
};

        foreach (var userRole in user.UserRoles)
        {
            claims.Add(new Claim(
                ClaimTypes.Role,
                userRole.Role.RoleName));
        }

        var securityKey = new SymmetricSecurityKey(keyBytes);

        var credentials = new SigningCredentials(
            securityKey,
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler()
            .WriteToken(token);

        return new AuthResponse
        {
            UserId = user.UserId,
            FullName = user.FullName,
            Email = user.Email,
            AccessToken = accessToken,
            TokenType = "Bearer",
            ExpiresAtUtc = expiresAt
        };
    }
}
