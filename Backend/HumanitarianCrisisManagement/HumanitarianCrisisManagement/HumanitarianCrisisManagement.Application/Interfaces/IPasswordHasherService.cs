using HumanitarianCrisisManagement.Domain.Entities;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IPasswordHasherService
{
    string HashPassword(User user, string password);

    bool VerifyPassword(User user, string passwordHash, string providedPassword);
}
