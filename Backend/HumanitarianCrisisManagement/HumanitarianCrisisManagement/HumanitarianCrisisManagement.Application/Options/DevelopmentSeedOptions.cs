namespace HumanitarianCrisisManagement.Application.Options;

public class DevelopmentSeedOptions
{
    public const string SectionName = "DevelopmentSeed";

    public bool Enabled { get; set; } = false;

    public List<DevelopmentSeedUserOption> Users { get; set; } = new();
}

public class DevelopmentSeedUserOption
{
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string RoleName { get; set; } = "Citizen";

    public string? PhoneNumber { get; set; }
}
