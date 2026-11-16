using HumanitarianCrisisManagement.Application.DTOs.Auth;
using HumanitarianCrisisManagement.Domain.Entities;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IJwtTokenService
{
    AuthResponse GenerateToken(User user);
}
