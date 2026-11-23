using HumanitarianCrisisManagement.Application.Interfaces;

namespace HumanitarianCrisisManagement.Tests;

public sealed record SyntheticGroqScenario(
    string ScenarioId,
    string Title,
    AiAnalysisContext Context,
    string[] ExpectedUrgencyLevels,
    bool ExpectDuplicateSignal,
    int? ExpectedDuplicateRequestId,
    int[] EligibleInventoryIds);

public static class SyntheticGroqScenarios
{
    public static IReadOnlyList<SyntheticGroqScenario> All { get; } =
    [
        new SyntheticGroqScenario(
            ScenarioId: "SYN-01",
            Title: "Severe Flooding – Urgent Evacuation & Medical Assistance",
            Context: new AiAnalysisContext
            {
                CitizenRequestId = 90001,
                RequestType = "Rescue",
                Description = "Fictional severe flood evacuation and medical trauma scenario for synthetic validation only.",
                CurrentUrgencyLevel = "Critical",
                PeopleCount = 18,
                AreaId = 901,
                AreaName = "Synthetic Flood Basin North",
                Address = "SYNTHETIC-EXCLUDED-ADDRESS-01",
                CrisisId = 9101,
                CrisisName = "SYN-FLOOD-2026 Severe Monsoon Surge",
                CrisisType = "Flood",
                CrisisSeverityLevel = "Critical",
                RecentAreaRequests = Array.Empty<AiSiblingRequestSnapshot>(),
                AvailableInventories =
                [
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95001,
                        WarehouseId = 9801,
                        WarehouseName = "Synthetic North Depot",
                        ResourceId = 9701,
                        ResourceName = "Emergency Medical Kit",
                        ResourceCategory = "Medical",
                        QuantityAvailable = 40m
                    },
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95002,
                        WarehouseId = 9801,
                        WarehouseName = "Synthetic North Depot",
                        ResourceId = 9702,
                        ResourceName = "Evacuation Lifejacket & Rescue Pack",
                        ResourceCategory = "Rescue",
                        QuantityAvailable = 20m
                    }
                ]
            },
            ExpectedUrgencyLevels: ["High", "Critical"],
            ExpectDuplicateSignal: false,
            ExpectedDuplicateRequestId: null,
            EligibleInventoryIds: [95001, 95002]),

        new SyntheticGroqScenario(
            ScenarioId: "SYN-02",
            Title: "Building Fire – Multiple Fictional Affected Households",
            Context: new AiAnalysisContext
            {
                CitizenRequestId = 90002,
                RequestType = "Shelter",
                Description = "Fictional multi-household apartment fire displacement scenario for synthetic validation only.",
                CurrentUrgencyLevel = "High",
                PeopleCount = 24,
                AreaId = 902,
                AreaName = "Synthetic Metro Sector 4",
                Address = "SYNTHETIC-EXCLUDED-ADDRESS-02",
                CrisisId = 9102,
                CrisisName = "SYN-FIRE-2026 Multi-Unit Apartment Fire",
                CrisisType = "Fire",
                CrisisSeverityLevel = "High",
                RecentAreaRequests = Array.Empty<AiSiblingRequestSnapshot>(),
                AvailableInventories =
                [
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95003,
                        WarehouseId = 9802,
                        WarehouseName = "Synthetic Metro Hub",
                        ResourceId = 9703,
                        ResourceName = "Emergency Family Shelter Tent Pack",
                        ResourceCategory = "Shelter",
                        QuantityAvailable = 30m
                    },
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95004,
                        WarehouseId = 9802,
                        WarehouseName = "Synthetic Metro Hub",
                        ResourceId = 9704,
                        ResourceName = "Bottled Drinking Water Case",
                        ResourceCategory = "Water",
                        QuantityAvailable = 100m
                    }
                ]
            },
            ExpectedUrgencyLevels: ["High", "Critical"],
            ExpectDuplicateSignal: false,
            ExpectedDuplicateRequestId: null,
            EligibleInventoryIds: [95003, 95004]),

        new SyntheticGroqScenario(
            ScenarioId: "SYN-03",
            Title: "Low-Urgency Basic Food Supplies",
            Context: new AiAnalysisContext
            {
                CitizenRequestId = 90003,
                RequestType = "Food",
                Description = "Fictional low-urgency dry ration request for synthetic validation only.",
                CurrentUrgencyLevel = "Low",
                PeopleCount = 2,
                AreaId = 903,
                AreaName = "Synthetic Highland Zone B",
                Address = "SYNTHETIC-EXCLUDED-ADDRESS-03",
                CrisisId = 9103,
                CrisisName = "SYN-DROUGHT-2026 Mild Dry Spell",
                CrisisType = "Drought",
                CrisisSeverityLevel = "Low",
                RecentAreaRequests = Array.Empty<AiSiblingRequestSnapshot>(),
                AvailableInventories =
                [
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95005,
                        WarehouseId = 9803,
                        WarehouseName = "Synthetic Highland Store",
                        ResourceId = 9705,
                        ResourceName = "Basic Dry Ration Pack",
                        ResourceCategory = "Food",
                        QuantityAvailable = 200m
                    }
                ]
            },
            ExpectedUrgencyLevels: ["Low", "Medium"],
            ExpectDuplicateSignal: false,
            ExpectedDuplicateRequestId: null,
            EligibleInventoryIds: [95005]),

        new SyntheticGroqScenario(
            ScenarioId: "SYN-04",
            Title: "Urgent Medical Emergency",
            Context: new AiAnalysisContext
            {
                CitizenRequestId = 90004,
                RequestType = "Medical",
                Description = "Fictional acute medical emergency requiring urgent trauma and insulin supplies.",
                CurrentUrgencyLevel = "Critical",
                PeopleCount = 3,
                AreaId = 904,
                AreaName = "Synthetic Coastal Ward 9",
                Address = "SYNTHETIC-EXCLUDED-ADDRESS-04",
                CrisisId = 9104,
                CrisisName = "SYN-CYCLONE-2026 Coastal Storm",
                CrisisType = "Cyclone",
                CrisisSeverityLevel = "Critical",
                RecentAreaRequests = Array.Empty<AiSiblingRequestSnapshot>(),
                AvailableInventories =
                [
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95001,
                        WarehouseId = 9801,
                        WarehouseName = "Synthetic North Depot",
                        ResourceId = 9701,
                        ResourceName = "Emergency Medical Kit",
                        ResourceCategory = "Medical",
                        QuantityAvailable = 40m
                    }
                ]
            },
            ExpectedUrgencyLevels: ["High", "Critical"],
            ExpectDuplicateSignal: false,
            ExpectedDuplicateRequestId: null,
            EligibleInventoryIds: [95001]),

        new SyntheticGroqScenario(
            ScenarioId: "SYN-05",
            Title: "Duplicate Detection – Two Highly Similar Fictional Requests",
            Context: new AiAnalysisContext
            {
                CitizenRequestId = 90005,
                RequestType = "Water",
                Description = "Fictional duplicate clean water request in Synthetic River Delta Sector 2.",
                CurrentUrgencyLevel = "High",
                PeopleCount = 10,
                AreaId = 905,
                AreaName = "Synthetic River Delta Sector 2",
                Address = "SYNTHETIC-EXCLUDED-ADDRESS-05",
                CrisisId = 9105,
                CrisisName = "SYN-FLOOD-DELTA-2026 River Overflow",
                CrisisType = "Flood",
                CrisisSeverityLevel = "High",
                RecentAreaRequests =
                [
                    new AiSiblingRequestSnapshot
                    {
                        RequestId = 90099,
                        RequestType = "Water",
                        Description = "Fictional duplicate clean water request in Synthetic River Delta Sector 2.",
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow.AddMinutes(-5)
                    }
                ],
                AvailableInventories =
                [
                    new AiAvailableInventorySnapshot
                    {
                        InventoryId = 95004,
                        WarehouseId = 9802,
                        WarehouseName = "Synthetic Metro Hub",
                        ResourceId = 9704,
                        ResourceName = "Bottled Drinking Water Case",
                        ResourceCategory = "Water",
                        QuantityAvailable = 100m
                    }
                ]
            },
            ExpectedUrgencyLevels: ["Medium", "High", "Critical"],
            ExpectDuplicateSignal: true,
            ExpectedDuplicateRequestId: 90099,
            EligibleInventoryIds: [95004])
    ];
}
