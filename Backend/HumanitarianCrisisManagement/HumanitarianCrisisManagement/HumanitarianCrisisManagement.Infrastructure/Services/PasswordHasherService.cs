using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

public class PasswordHasherService : IPasswordHasherService
{
    private readonly PasswordHasher<User> _passwordHasher;

    public PasswordHasherService()
    {
        _passwordHasher = new PasswordHasher<User>();
    }

    public string HashPassword(User user, string password)
    {
        return _passwordHasher.HashPassword(user, password);
    }

    public bool VerifyPassword(
        User user,
        string passwordHash,
        string providedPassword)
    {
        var result = _passwordHasher.VerifyHashedPassword(
            user,
            passwordHash,
            providedPassword);

        return result != PasswordVerificationResult.Failed;
    }
}
