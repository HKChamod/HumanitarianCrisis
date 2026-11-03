namespace HumanitarianCrisisAPI.Models;

public class UserRole
{
    public int UserRoleId { get; set; }

    public int UserId { get; set; }

    public int RoleId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;

    public Role Role { get; set; } = null!;
}