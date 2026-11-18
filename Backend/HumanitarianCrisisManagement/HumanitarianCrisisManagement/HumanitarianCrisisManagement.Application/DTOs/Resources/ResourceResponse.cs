namespace HumanitarianCrisisManagement.Application.DTOs.Resources;

public class ResourceResponse
{
    public int ResourceId { get; set; }

    public string ResourceName { get; set; } = string.Empty;

    public string ResourceCategory { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string UnitOfMeasure { get; set; } = string.Empty;

    public bool IsPerishable { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}