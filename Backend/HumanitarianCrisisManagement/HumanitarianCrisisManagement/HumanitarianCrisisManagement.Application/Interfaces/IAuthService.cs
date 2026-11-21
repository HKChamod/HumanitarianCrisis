using HumanitarianCrisisManagement.Application.DTOs.Auth;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);

    Task<AuthResponse> LoginAsync(LoginRequest request);

    Task<CurrentUserResponse?> GetCurrentUserAsync(int userId);
}
