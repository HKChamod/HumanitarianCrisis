namespace HumanitarianCrisisAPI.Models;

public class User
{
    public int UserId { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? Address { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
        = DateTime.UtcNow;

    // Navigation property
    public ICollection<UserRole> UserRoles { get; set; }
        = new List<UserRole>();

    public ICollection<AssistanceRequest> AssistanceRequests
    { get; set; } = new List<AssistanceRequest>();
}