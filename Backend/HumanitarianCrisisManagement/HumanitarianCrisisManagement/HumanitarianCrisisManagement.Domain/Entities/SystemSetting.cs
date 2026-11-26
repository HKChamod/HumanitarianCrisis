namespace HumanitarianCrisisManagement.Domain.Entities;

public class SystemSetting
{
    public int SystemSettingId { get; set; }

    public string SettingKey { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public string SettingValue { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}
