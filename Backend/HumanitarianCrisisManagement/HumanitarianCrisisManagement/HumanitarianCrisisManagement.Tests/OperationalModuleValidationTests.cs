using HumanitarianCrisisManagement.Application.DTOs.Dashboard;
using HumanitarianCrisisManagement.Application.DTOs.Donations;
using HumanitarianCrisisManagement.Application.DTOs.Shelters;
using HumanitarianCrisisManagement.Application.DTOs.Users;
using HumanitarianCrisisManagement.Infrastructure.Services;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

public class OperationalModuleValidationTests
{
    [Fact]
    public void ShelterResponse_AvailableCapacity_NeverReturnsNegative()
    {
        var openShelter = new ShelterResponse { Capacity = 200, CurrentOccupancy = 75 };
        var fullShelter = new ShelterResponse { Capacity = 100, CurrentOccupancy = 100 };
        var overflowGuard = new ShelterResponse { Capacity = 50, CurrentOccupancy = 60 };

        Assert.Equal(125, openShelter.AvailableCapacity);
        Assert.Equal(0, fullShelter.AvailableCapacity);
        Assert.Equal(0, overflowGuard.AvailableCapacity);
    }

    [Fact]
    public void SystemDashboardResponse_AvailableShelterCapacity_CalculatesAccurately()
    {
        var dashboard = new SystemDashboardResponse
        {
            TotalShelterCapacity = 500,
            TotalShelterOccupancy = 320
        };

        Assert.Equal(180, dashboard.AvailableShelterCapacity);
    }

    [Fact]
    public async Task UserManagementService_UpdateRolesAsync_BlocksSelfRoleModification()
    {
        var service = new UserManagementService(null!, null!, null!);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.UpdateRolesAsync(
                userId: 5,
                new UpdateUserRolesRequest { RoleIds = [2] },
                actorUserId: 5));

        Assert.Contains("own role", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task UserManagementService_SetActiveStatusAsync_BlocksSelfDeactivation()
    {
        var service = new UserManagementService(null!, null!, null!);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SetActiveStatusAsync(userId: 5, isActive: false, actorUserId: 5));

        Assert.Contains("deactivate your own account", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ShelterService_CreateAsync_RejectsZeroCapacityAndOccupancyExceedingCapacity()
    {
        var service = new ShelterService(null!, null!, null!);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(new CreateShelterRequest
            {
                ShelterName = "Test Shelter",
                AreaId = 1,
                Address = "123 Road",
                Capacity = 0,
                CurrentOccupancy = 0
            }, actorUserId: 1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(new CreateShelterRequest
            {
                ShelterName = "Test Shelter",
                AreaId = 1,
                Address = "123 Road",
                Capacity = 50,
                CurrentOccupancy = 55
            }, actorUserId: 1));
    }

    [Fact]
    public async Task DonationService_CreateAsync_ValidatesDonationTypeAndRequiredAmounts()
    {
        var service = new DonationService(null!, null!, null!, null!);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(new CreateDonationRequest
            {
                DonorName = "Test Donor",
                DonationType = "InvalidType"
            }, actorUserId: 1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(new CreateDonationRequest
            {
                DonorName = "Test Donor",
                DonationType = "Monetary",
                Amount = 0
            }, actorUserId: 1));

        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.CreateAsync(new CreateDonationRequest
            {
                DonorName = "Test Donor",
                DonationType = "Resource",
                ResourceId = null,
                Quantity = 10
            }, actorUserId: 1));
    }
}
