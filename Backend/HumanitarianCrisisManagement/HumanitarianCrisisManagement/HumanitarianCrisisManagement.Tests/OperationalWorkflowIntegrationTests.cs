using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using HumanitarianCrisisManagement.Application.DTOs.AiRecommendations;
using HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;
using HumanitarianCrisisManagement.Application.DTOs.Shelters;
using HumanitarianCrisisManagement.Application.DTOs.Volunteers;
using HumanitarianCrisisManagement.Application.Interfaces;
using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using HumanitarianCrisisManagement.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace HumanitarianCrisisManagement.Tests;

/// <summary>
/// Operational workflow integration tests exercising real ASP.NET Core HTTP endpoints,
/// JWT authentication, permission-based authorization, EF Core persistence (isolated SQLite in-memory),
/// transaction boundaries, and cross-module consistency across:
/// - Workflow A: Crisis Resource Allocation + WarehouseInventory + InventoryTransaction
/// - Workflow B: Shelter Placement + Shelter capacity/status management
/// - Workflow C: Volunteer Assignment + Volunteer availability lifecycle
/// - Workflow D: Cross-module operational consistency
/// Never connects to SQL Server (HumanitarianCrisisDB) and never calls any live AI provider.
/// </summary>
public class OperationalWorkflowIntegrationTests
{
    private const int CitizenUserId = 9101;
    private const int AdminUserId = 9102;
    private const int SyntheticAreaId = 9101;
    private const int ActiveCrisisId = 9101;
    private const int ClosedCrisisId = 9102;
    private const int SyntheticCitizenRequestId = 9101;
    private const int SyntheticResourceId = 9101;
    private const int SyntheticWarehouseId = 9101;
    private const int SyntheticInventoryId = 9101;
    private const int OpenShelterId = 9101;
    private const int ClosedShelterId = 9102;
    private const int ApprovedVolunteerId = 9101;
    private const int PendingVolunteerId = 9102;
    private const int UnavailableVolunteerId = 9103;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    // =========================================================================
    // Workflow A: Crisis Resource Allocation
    // =========================================================================

    [Fact]
    public async Task WorkflowA_ResourceAllocation_FullLifecycle_CreateApproveDispatchDeliver_UpdatesInventoryAndRecordsAudit()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(initialStock: 100m);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // 1. Create allocation (Pending; inventory unchanged)
        var createRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                CitizenRequestId = SyntheticCitizenRequestId,
                QuantityRequested = 40m,
                ReferenceNumber = "SYN-ALLOC-001",
                Notes = "Synthetic crisis relief allocation."
            });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);

        var created = await createRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions);
        Assert.NotNull(created);
        Assert.Equal("Pending", created.Status);
        Assert.Equal(40m, created.QuantityRequested);
        Assert.Equal(0m, created.QuantityAllocated);
        Assert.Equal(SyntheticCitizenRequestId, created.CitizenRequestId);

        // 2. Approve allocation (Approved; inventory still unchanged until dispatch)
        var approveRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest
            {
                QuantityAllocated = 35m,
                Notes = "Approved 35 units."
            });
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);

        var approved = await approveRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions);
        Assert.NotNull(approved);
        Assert.Equal("Approved", approved.Status);
        Assert.Equal(35m, approved.QuantityAllocated);
        Assert.Equal(AdminUserId, approved.ApprovedByUserId);

        await using (var midScope = env.CreateVerificationScope())
        {
            var midDb = midScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var midInv = await midDb.WarehouseInventories.AsNoTracking()
                .SingleAsync(i => i.InventoryId == SyntheticInventoryId);
            Assert.Equal(100m, midInv.QuantityAvailable);
            Assert.Empty(await midDb.InventoryTransactions.AsNoTracking().ToListAsync());
        }

        // 3. Dispatch allocation (Dispatched; atomic StockOut transaction deducts 35 units)
        var dispatchRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/dispatch",
            new UpdateResourceAllocationStatusRequest
            {
                Notes = "Dispatched to synthetic district."
            });
        Assert.Equal(HttpStatusCode.OK, dispatchRes.StatusCode);

        var dispatched = await dispatchRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions);
        Assert.NotNull(dispatched);
        Assert.Equal("Dispatched", dispatched.Status);

        // 4. Deliver allocation (Delivered; no additional stock change)
        var deliverRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/deliver",
            new UpdateResourceAllocationStatusRequest
            {
                Notes = "Delivered and signed off."
            });
        Assert.Equal(HttpStatusCode.OK, deliverRes.StatusCode);

        // 5. Verify full persistence via fresh DbContext
        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persistedAlloc = await db.ResourceAllocations.AsNoTracking()
            .SingleAsync(a => a.AllocationId == created.AllocationId);
        Assert.Equal(ResourceAllocationStatus.Delivered, persistedAlloc.Status);
        Assert.Equal(40m, persistedAlloc.QuantityRequested);
        Assert.Equal(35m, persistedAlloc.QuantityAllocated);
        Assert.Equal(SyntheticCitizenRequestId, persistedAlloc.CitizenRequestId);
        Assert.Equal(ActiveCrisisId, persistedAlloc.CrisisId);

        var persistedInv = await db.WarehouseInventories.AsNoTracking()
            .SingleAsync(i => i.InventoryId == SyntheticInventoryId);
        Assert.Equal(65m, persistedInv.QuantityAvailable);

        var tx = await db.InventoryTransactions.AsNoTracking().SingleAsync();
        Assert.Equal(SyntheticInventoryId, tx.InventoryId);
        Assert.Equal(InventoryTransactionType.StockOut, tx.TransactionType);
        Assert.Equal(35m, tx.Quantity);
        Assert.Equal(100m, tx.PreviousQuantity);
        Assert.Equal(65m, tx.NewQuantity);
        Assert.Equal(AdminUserId, tx.PerformedByUserId);

        var auditActions = await db.AuditLogs.AsNoTracking()
            .Select(a => a.Action)
            .ToListAsync();
        Assert.Contains("ResourceAllocation.Created", auditActions);
        Assert.Contains("ResourceAllocation.Approved", auditActions);
        Assert.Contains("ResourceAllocation.Dispatched", auditActions);
        Assert.Contains("ResourceAllocation.Delivered", auditActions);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task WorkflowA_ResourceAllocation_DispatchExceedingStock_RollsBackAtomicallyAndPreservesInventory()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(initialStock: 20m);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        var createRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                QuantityRequested = 50m,
                ReferenceNumber = "SYN-OVERSTOCK-001"
            });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);
        var created = (await createRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        var approveRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 50m });
        Assert.Equal(HttpStatusCode.OK, approveRes.StatusCode);

        // Dispatching 50 when only 20 available must fail and roll back
        var dispatchRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/dispatch",
            new UpdateResourceAllocationStatusRequest { Notes = "Attempt over-dispatch." });
        Assert.Equal(HttpStatusCode.BadRequest, dispatchRes.StatusCode);

        var problem = await dispatchRes.Content.ReadFromJsonAsync<ProblemDetails>(JsonOptions);
        Assert.NotNull(problem);
        Assert.Contains("Insufficient available stock", problem.Detail, StringComparison.OrdinalIgnoreCase);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persistedAlloc = await db.ResourceAllocations.AsNoTracking()
            .SingleAsync(a => a.AllocationId == created.AllocationId);
        Assert.Equal(ResourceAllocationStatus.Approved, persistedAlloc.Status);

        var persistedInv = await db.WarehouseInventories.AsNoTracking()
            .SingleAsync(i => i.InventoryId == SyntheticInventoryId);
        Assert.Equal(20m, persistedInv.QuantityAvailable);

        Assert.Empty(await db.InventoryTransactions.AsNoTracking().ToListAsync());
        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task WorkflowA_ResourceAllocation_CancelDispatchedAllocation_RestoresStockAtomicallyAndBlocksDuplicateCancel()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(initialStock: 100m);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        var created = (await (await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                QuantityRequested = 30m
            })).Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 30m })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/dispatch",
            new UpdateResourceAllocationStatusRequest { Notes = "Dispatched." })).StatusCode);

        // Cancel dispatched allocation -> restores 30 units via StockIn
        var cancelRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/cancel",
            new UpdateResourceAllocationStatusRequest { Notes = "Road blocked; stock returned." });
        Assert.Equal(HttpStatusCode.OK, cancelRes.StatusCode);

        // Duplicate cancel must be rejected
        var duplicateCancelRes = await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{created.AllocationId}/cancel",
            new UpdateResourceAllocationStatusRequest { Notes = "Duplicate cancel." });
        Assert.Equal(HttpStatusCode.BadRequest, duplicateCancelRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persistedAlloc = await db.ResourceAllocations.AsNoTracking()
            .SingleAsync(a => a.AllocationId == created.AllocationId);
        Assert.Equal(ResourceAllocationStatus.Cancelled, persistedAlloc.Status);

        var persistedInv = await db.WarehouseInventories.AsNoTracking()
            .SingleAsync(i => i.InventoryId == SyntheticInventoryId);
        Assert.Equal(100m, persistedInv.QuantityAvailable);

        var txs = await db.InventoryTransactions.AsNoTracking()
            .OrderBy(t => t.InventoryTransactionId)
            .ToListAsync();
        Assert.Equal(2, txs.Count);
        Assert.Equal(InventoryTransactionType.StockOut, txs[0].TransactionType);
        Assert.Equal(70m, txs[0].NewQuantity);
        Assert.Equal(InventoryTransactionType.StockIn, txs[1].TransactionType);
        Assert.Equal(100m, txs[1].NewQuantity);
    }

    [Fact]
    public async Task WorkflowA_ResourceAllocation_InvalidQuantitiesAndMissingEntities_RejectedWithoutPersisting()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(initialStock: 100m);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // Zero quantity
        var zeroRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                QuantityRequested = 0m
            });
        Assert.Equal(HttpStatusCode.BadRequest, zeroRes.StatusCode);

        // Closed crisis
        var closedCrisisRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ClosedCrisisId,
                QuantityRequested = 10m
            });
        Assert.Equal(HttpStatusCode.BadRequest, closedCrisisRes.StatusCode);

        // Non-existent inventory
        var missingInvRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = 999999,
                CrisisId = ActiveCrisisId,
                QuantityRequested = 10m
            });
        Assert.Equal(HttpStatusCode.NotFound, missingInvRes.StatusCode);

        // Non-existent linked citizen request
        var missingReqRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                CitizenRequestId = 999999,
                QuantityRequested = 10m
            });
        Assert.Equal(HttpStatusCode.NotFound, missingReqRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await db.ResourceAllocations.AsNoTracking().ToListAsync());
        Assert.Empty(await db.InventoryTransactions.AsNoTracking().ToListAsync());
        Assert.Equal(100m, (await db.WarehouseInventories.AsNoTracking().SingleAsync()).QuantityAvailable);
    }

    [Fact]
    public async Task WorkflowA_ResourceAllocation_Authorization_Enforces401And403()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(initialStock: 100m);

        var payload = new CreateResourceAllocationRequest
        {
            InventoryId = SyntheticInventoryId,
            CrisisId = ActiveCrisisId,
            QuantityRequested = 10m
        };

        using var anonClient = env.CreateAnonymousClient();
        var anonRes = await anonClient.PostAsJsonAsync("/api/ResourceAllocations", payload);
        Assert.Equal(HttpStatusCode.Unauthorized, anonRes.StatusCode);

        using var citizenClient = env.CreateAuthenticatedClient(CitizenUserId);
        var citizenRes = await citizenClient.PostAsJsonAsync("/api/ResourceAllocations", payload);
        Assert.Equal(HttpStatusCode.Forbidden, citizenRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await db.ResourceAllocations.AsNoTracking().ToListAsync());
    }

    // =========================================================================
    // Workflow B: Shelter Placement
    // =========================================================================

    [Fact]
    public async Task WorkflowB_ShelterPlacement_CheckInToFullAndCheckOut_UpdatesOccupancyStatusAndAuditLogs()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(shelterCapacity: 10, shelterOccupancy: 4);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // Check in 6 people -> 4 + 6 = 10 -> Status becomes "Full"
        var createRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = OpenShelterId,
                CitizenRequestId = SyntheticCitizenRequestId,
                ResidentName = "Synthetic Household A",
                PeopleCount = 6,
                Notes = "Flood evacuation placement."
            });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);

        var placement = await createRes.Content.ReadFromJsonAsync<ShelterPlacementResponse>(JsonOptions);
        Assert.NotNull(placement);
        Assert.Equal(OpenShelterId, placement.ShelterId);
        Assert.Equal(SyntheticCitizenRequestId, placement.CitizenRequestId);
        Assert.Equal(6, placement.PeopleCount);
        Assert.Equal("Active", placement.Status);
        Assert.Equal(AdminUserId, placement.AssignedByUserId);

        await using (var midScope = env.CreateVerificationScope())
        {
            var midDb = midScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var shelter = await midDb.Shelters.AsNoTracking().SingleAsync(s => s.ShelterId == OpenShelterId);
            Assert.Equal(10, shelter.CurrentOccupancy);
            Assert.Equal("Full", shelter.Status);
        }

        // Check out placement -> 10 - 6 = 4 -> Status returns to "Open"
        var checkoutRes = await client.PatchAsync(
            $"/api/Shelters/placements/{placement.PlacementId}/checkout",
            content: null);
        Assert.Equal(HttpStatusCode.OK, checkoutRes.StatusCode);

        var checkedOut = await checkoutRes.Content.ReadFromJsonAsync<ShelterPlacementResponse>(JsonOptions);
        Assert.NotNull(checkedOut);
        Assert.Equal("CheckedOut", checkedOut.Status);
        Assert.NotNull(checkedOut.CheckedOutAt);

        // Duplicate checkout must fail cleanly
        var dupCheckoutRes = await client.PatchAsync(
            $"/api/Shelters/placements/{placement.PlacementId}/checkout",
            content: null);
        Assert.Equal(HttpStatusCode.BadRequest, dupCheckoutRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persistedShelter = await db.Shelters.AsNoTracking().SingleAsync(s => s.ShelterId == OpenShelterId);
        Assert.Equal(4, persistedShelter.CurrentOccupancy);
        Assert.Equal("Open", persistedShelter.Status);

        var persistedPlacement = await db.ShelterPlacements.AsNoTracking()
            .SingleAsync(p => p.PlacementId == placement.PlacementId);
        Assert.Equal("CheckedOut", persistedPlacement.Status);
        Assert.NotNull(persistedPlacement.CheckedOutAt);

        var auditActions = await db.AuditLogs.AsNoTracking().Select(a => a.Action).ToListAsync();
        Assert.Contains("Shelter.PlacementCheckedIn", auditActions);
        Assert.Contains("Shelter.PlacementCheckedOut", auditActions);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task WorkflowB_ShelterPlacement_ExceedingCapacityOrClosedOrInvalid_RejectedWithoutPartialMutation()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(shelterCapacity: 10, shelterOccupancy: 8);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // Exceed remaining capacity (available = 2, requested = 3)
        var overCapRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = OpenShelterId,
                ResidentName = "Synthetic Household Over",
                PeopleCount = 3
            });
        Assert.Equal(HttpStatusCode.BadRequest, overCapRes.StatusCode);

        // Closed shelter
        var closedRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = ClosedShelterId,
                ResidentName = "Synthetic Household Closed",
                PeopleCount = 2
            });
        Assert.Equal(HttpStatusCode.BadRequest, closedRes.StatusCode);

        // Zero people count
        var zeroRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = OpenShelterId,
                ResidentName = "Synthetic Zero",
                PeopleCount = 0
            });
        Assert.Equal(HttpStatusCode.BadRequest, zeroRes.StatusCode);

        // Non-existent shelter
        var missingShelterRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = 999999,
                ResidentName = "Synthetic Missing",
                PeopleCount = 1
            });
        Assert.Equal(HttpStatusCode.NotFound, missingShelterRes.StatusCode);

        // Non-existent linked citizen request
        var missingReqRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = OpenShelterId,
                CitizenRequestId = 999999,
                ResidentName = "Synthetic Missing Request",
                PeopleCount = 1
            });
        Assert.Equal(HttpStatusCode.NotFound, missingReqRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        Assert.Empty(await db.ShelterPlacements.AsNoTracking().ToListAsync());
        Assert.Empty(await db.AuditLogs.AsNoTracking().ToListAsync());

        var openShelter = await db.Shelters.AsNoTracking().SingleAsync(s => s.ShelterId == OpenShelterId);
        Assert.Equal(8, openShelter.CurrentOccupancy);
        Assert.Equal("Open", openShelter.Status);

        var closedShelter = await db.Shelters.AsNoTracking().SingleAsync(s => s.ShelterId == ClosedShelterId);
        Assert.Equal(0, closedShelter.CurrentOccupancy);
        Assert.Equal("Closed", closedShelter.Status);
    }

    [Fact]
    public async Task WorkflowB_ShelterPlacement_Authorization_Enforces401And403()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(shelterCapacity: 10, shelterOccupancy: 0);

        var payload = new CreateShelterPlacementRequest
        {
            ShelterId = OpenShelterId,
            ResidentName = "Synthetic Unauthorized",
            PeopleCount = 2
        };

        using var anonClient = env.CreateAnonymousClient();
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await anonClient.PostAsJsonAsync("/api/Shelters/placements", payload)).StatusCode);

        using var citizenClient = env.CreateAuthenticatedClient(CitizenUserId);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await citizenClient.PostAsJsonAsync("/api/Shelters/placements", payload)).StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await db.ShelterPlacements.AsNoTracking().ToListAsync());
        Assert.Equal(0, (await db.Shelters.AsNoTracking().SingleAsync(s => s.ShelterId == OpenShelterId)).CurrentOccupancy);
    }

    // =========================================================================
    // Workflow C: Volunteer Assignment
    // =========================================================================

    [Fact]
    public async Task WorkflowC_VolunteerAssignment_AssignAndComplete_UpdatesAvailabilityAndRecordsAuditLogs()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // 1. Assign approved available volunteer -> Deployed
        var createRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = ApprovedVolunteerId,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Field Medic",
                TaskDescription = "Emergency triage at relief camp.",
                Notes = "Synthetic assignment."
            });
        Assert.Equal(HttpStatusCode.Created, createRes.StatusCode);

        var assignment = await createRes.Content.ReadFromJsonAsync<VolunteerAssignmentResponse>(JsonOptions);
        Assert.NotNull(assignment);
        Assert.Equal(ApprovedVolunteerId, assignment.VolunteerId);
        Assert.Equal(ActiveCrisisId, assignment.CrisisId);
        Assert.Equal("Assigned", assignment.Status);
        Assert.Equal(AdminUserId, assignment.AssignedByUserId);

        await using (var midScope = env.CreateVerificationScope())
        {
            var midDb = midScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var volunteer = await midDb.Volunteers.AsNoTracking().SingleAsync(v => v.VolunteerId == ApprovedVolunteerId);
            Assert.Equal("Deployed", volunteer.AvailabilityStatus);
        }

        // 2. Complete assignment -> returns volunteer to Available
        var completeRes = await client.PatchAsJsonAsync(
            $"/api/Volunteers/assignments/{assignment.AssignmentId}/status",
            new UpdateVolunteerAssignmentStatusRequest
            {
                Status = "Completed",
                Notes = "Shift completed."
            });
        Assert.Equal(HttpStatusCode.OK, completeRes.StatusCode);

        var completed = await completeRes.Content.ReadFromJsonAsync<VolunteerAssignmentResponse>(JsonOptions);
        Assert.NotNull(completed);
        Assert.Equal("Completed", completed.Status);
        Assert.NotNull(completed.CompletedAt);

        // 3. Modifying a completed assignment must fail
        var mutateCompletedRes = await client.PatchAsJsonAsync(
            $"/api/Volunteers/assignments/{assignment.AssignmentId}/status",
            new UpdateVolunteerAssignmentStatusRequest { Status = "Active" });
        Assert.Equal(HttpStatusCode.BadRequest, mutateCompletedRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var persistedVol = await db.Volunteers.AsNoTracking().SingleAsync(v => v.VolunteerId == ApprovedVolunteerId);
        Assert.Equal("Available", persistedVol.AvailabilityStatus);

        var persistedAssign = await db.VolunteerAssignments.AsNoTracking()
            .SingleAsync(a => a.AssignmentId == assignment.AssignmentId);
        Assert.Equal("Completed", persistedAssign.Status);
        Assert.NotNull(persistedAssign.CompletedAt);

        var auditActions = await db.AuditLogs.AsNoTracking().Select(a => a.Action).ToListAsync();
        Assert.Contains("Volunteer.Assigned", auditActions);
        Assert.Contains("Volunteer.AssignmentCompleted", auditActions);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    [Fact]
    public async Task WorkflowC_VolunteerAssignment_DuplicateAndInvalidConditions_RejectedWithoutInconsistentState()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync();
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // First valid assignment succeeds
        var firstRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = ApprovedVolunteerId,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Logistics Coordinator"
            });
        Assert.Equal(HttpStatusCode.Created, firstRes.StatusCode);

        // Duplicate active assignment for same volunteer + crisis -> 400
        var dupRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = ApprovedVolunteerId,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Duplicate Role"
            });
        Assert.Equal(HttpStatusCode.BadRequest, dupRes.StatusCode);

        // Pending (unapproved) volunteer -> 400
        var unapprovedRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = PendingVolunteerId,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Support"
            });
        Assert.Equal(HttpStatusCode.BadRequest, unapprovedRes.StatusCode);

        // Unavailable volunteer -> 400
        var unavailableRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = UnavailableVolunteerId,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Support"
            });
        Assert.Equal(HttpStatusCode.BadRequest, unavailableRes.StatusCode);

        // Closed crisis -> 400
        var closedCrisisRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = ApprovedVolunteerId,
                CrisisId = ClosedCrisisId,
                RoleTitle = "Closed Crisis Support"
            });
        Assert.Equal(HttpStatusCode.BadRequest, closedCrisisRes.StatusCode);

        // Non-existent volunteer -> 404
        var missingVolRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = 999999,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Missing Volunteer"
            });
        Assert.Equal(HttpStatusCode.NotFound, missingVolRes.StatusCode);

        // Non-existent crisis -> 404
        var missingCrisisRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = ApprovedVolunteerId,
                CrisisId = 999999,
                RoleTitle = "Missing Crisis"
            });
        Assert.Equal(HttpStatusCode.NotFound, missingCrisisRes.StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var assignments = await db.VolunteerAssignments.AsNoTracking().ToListAsync();
        Assert.Single(assignments);
        Assert.Equal(ApprovedVolunteerId, assignments[0].VolunteerId);
        Assert.Equal(ActiveCrisisId, assignments[0].CrisisId);

        var pendingVol = await db.Volunteers.AsNoTracking().SingleAsync(v => v.VolunteerId == PendingVolunteerId);
        Assert.Equal("Available", pendingVol.AvailabilityStatus);
        Assert.Equal("Pending", pendingVol.ApprovalStatus);

        var unavailVol = await db.Volunteers.AsNoTracking().SingleAsync(v => v.VolunteerId == UnavailableVolunteerId);
        Assert.Equal("Unavailable", unavailVol.AvailabilityStatus);
    }

    [Fact]
    public async Task WorkflowC_VolunteerAssignment_Authorization_Enforces401And403()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync();

        var payload = new CreateVolunteerAssignmentRequest
        {
            VolunteerId = ApprovedVolunteerId,
            CrisisId = ActiveCrisisId,
            RoleTitle = "Field Support"
        };

        using var anonClient = env.CreateAnonymousClient();
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            (await anonClient.PostAsJsonAsync("/api/Volunteers/assignments", payload)).StatusCode);

        using var citizenClient = env.CreateAuthenticatedClient(CitizenUserId);
        Assert.Equal(
            HttpStatusCode.Forbidden,
            (await citizenClient.PostAsJsonAsync("/api/Volunteers/assignments", payload)).StatusCode);

        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await db.VolunteerAssignments.AsNoTracking().ToListAsync());
        Assert.Equal("Available", (await db.Volunteers.AsNoTracking().SingleAsync(v => v.VolunteerId == ApprovedVolunteerId)).AvailabilityStatus);
    }

    // =========================================================================
    // Workflow D: Cross-Module End-to-End Consistency
    // =========================================================================

    [Fact]
    public async Task WorkflowD_CrossModule_CoordinatedCrisisResponse_MaintainsRelationalIntegrityAndAuditTrail()
    {
        await using var env = await OperationalApiTestEnvironment.CreateAsync(
            initialStock: 100m,
            shelterCapacity: 20,
            shelterOccupancy: 0);
        using var client = env.CreateAuthenticatedClient(AdminUserId);

        // 1. Resource Allocation linked to ActiveCrisis + CitizenRequest -> Approve -> Dispatch
        var allocRes = await client.PostAsJsonAsync(
            "/api/ResourceAllocations",
            new CreateResourceAllocationRequest
            {
                InventoryId = SyntheticInventoryId,
                CrisisId = ActiveCrisisId,
                CitizenRequestId = SyntheticCitizenRequestId,
                QuantityRequested = 25m,
                ReferenceNumber = "SYN-XMOD-001"
            });
        Assert.Equal(HttpStatusCode.Created, allocRes.StatusCode);
        var alloc = (await allocRes.Content.ReadFromJsonAsync<ResourceAllocationResponse>(JsonOptions))!;

        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{alloc.AllocationId}/approve",
            new UpdateResourceAllocationStatusRequest { QuantityAllocated = 25m })).StatusCode);

        Assert.Equal(HttpStatusCode.OK, (await client.PatchAsJsonAsync(
            $"/api/ResourceAllocations/{alloc.AllocationId}/dispatch",
            new UpdateResourceAllocationStatusRequest { Notes = "Cross-module dispatch." })).StatusCode);

        // 2. Shelter Placement linked to OpenShelter + CitizenRequest
        var placementRes = await client.PostAsJsonAsync(
            "/api/Shelters/placements",
            new CreateShelterPlacementRequest
            {
                ShelterId = OpenShelterId,
                CitizenRequestId = SyntheticCitizenRequestId,
                ResidentName = "Synthetic Cross-Module Family",
                PeopleCount = 6
            });
        Assert.Equal(HttpStatusCode.Created, placementRes.StatusCode);
        var placement = (await placementRes.Content.ReadFromJsonAsync<ShelterPlacementResponse>(JsonOptions))!;

        // 3. Volunteer Assignment linked to ApprovedVolunteer + ActiveCrisis
        var assignRes = await client.PostAsJsonAsync(
            "/api/Volunteers/assignments",
            new CreateVolunteerAssignmentRequest
            {
                VolunteerId = ApprovedVolunteerId,
                CrisisId = ActiveCrisisId,
                RoleTitle = "Shelter & Relief Coordinator"
            });
        Assert.Equal(HttpStatusCode.Created, assignRes.StatusCode);
        var assignment = (await assignRes.Content.ReadFromJsonAsync<VolunteerAssignmentResponse>(JsonOptions))!;

        // 4. Verify entire cross-module relational graph via a fresh DbContext
        await using var verifyScope = env.CreateVerificationScope();
        var db = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var citizenRequest = await db.CitizenRequests
            .AsNoTracking()
            .Include(r => r.Area)
            .Include(r => r.CrisisEvent)
            .SingleAsync(r => r.RequestId == SyntheticCitizenRequestId);
        Assert.Equal(SyntheticAreaId, citizenRequest.AreaId);
        Assert.Equal(ActiveCrisisId, citizenRequest.CrisisId);
        Assert.NotNull(citizenRequest.CrisisEvent);
        Assert.Equal("Active", citizenRequest.CrisisEvent!.Status);

        var persistedAlloc = await db.ResourceAllocations
            .AsNoTracking()
            .Include(a => a.Inventory)
                .ThenInclude(i => i.Warehouse)
            .Include(a => a.Crisis)
            .SingleAsync(a => a.AllocationId == alloc.AllocationId);
        Assert.Equal(ResourceAllocationStatus.Dispatched, persistedAlloc.Status);
        Assert.Equal(SyntheticCitizenRequestId, persistedAlloc.CitizenRequestId);
        Assert.Equal(ActiveCrisisId, persistedAlloc.CrisisId);
        Assert.Equal(SyntheticAreaId, persistedAlloc.Inventory.Warehouse.AreaId);
        Assert.Equal(75m, persistedAlloc.Inventory.QuantityAvailable);

        var persistedTx = await db.InventoryTransactions.AsNoTracking().SingleAsync();
        Assert.Equal(SyntheticInventoryId, persistedTx.InventoryId);
        Assert.Equal(InventoryTransactionType.StockOut, persistedTx.TransactionType);
        Assert.Equal(25m, persistedTx.Quantity);
        Assert.Equal(75m, persistedTx.NewQuantity);

        var persistedPlacement = await db.ShelterPlacements
            .AsNoTracking()
            .Include(p => p.Shelter)
            .SingleAsync(p => p.PlacementId == placement.PlacementId);
        Assert.Equal(SyntheticCitizenRequestId, persistedPlacement.CitizenRequestId);
        Assert.Equal(OpenShelterId, persistedPlacement.ShelterId);
        Assert.Equal(SyntheticAreaId, persistedPlacement.Shelter.AreaId);
        Assert.Equal(6, persistedPlacement.Shelter.CurrentOccupancy);
        Assert.Equal("Open", persistedPlacement.Shelter.Status);

        var persistedAssignment = await db.VolunteerAssignments
            .AsNoTracking()
            .Include(a => a.Volunteer)
            .Include(a => a.Crisis)
            .SingleAsync(a => a.AssignmentId == assignment.AssignmentId);
        Assert.Equal(ApprovedVolunteerId, persistedAssignment.VolunteerId);
        Assert.Equal(ActiveCrisisId, persistedAssignment.CrisisId);
        Assert.Equal(SyntheticAreaId, persistedAssignment.Volunteer.AreaId);
        Assert.Equal("Deployed", persistedAssignment.Volunteer.AvailabilityStatus);

        var auditActions = await db.AuditLogs.AsNoTracking().Select(a => a.Action).ToListAsync();
        Assert.Contains("ResourceAllocation.Created", auditActions);
        Assert.Contains("ResourceAllocation.Approved", auditActions);
        Assert.Contains("ResourceAllocation.Dispatched", auditActions);
        Assert.Contains("Shelter.PlacementCheckedIn", auditActions);
        Assert.Contains("Volunteer.Assigned", auditActions);

        Assert.Equal(0, env.FakeAiProvider.CallCount);
    }

    // =========================================================================
    // Isolated Per-Test SQLite In-Memory WebApplicationFactory Environment
    // =========================================================================

    private sealed class OperationalApiTestEnvironment : IAsyncDisposable
    {
        private readonly SqliteConnection _connection;
        private readonly OperationalWebApplicationFactory _factory;

        public TrackingFakeAiAnalysisProvider FakeAiProvider { get; }

        private OperationalApiTestEnvironment(
            SqliteConnection connection,
            OperationalWebApplicationFactory factory,
            TrackingFakeAiAnalysisProvider fakeAiProvider)
        {
            _connection = connection;
            _factory = factory;
            FakeAiProvider = fakeAiProvider;
        }

        public static async Task<OperationalApiTestEnvironment> CreateAsync(
            decimal initialStock = 100m,
            int shelterCapacity = 20,
            int shelterOccupancy = 0)
        {
            var connection = new SqliteConnection("DataSource=:memory:");
            await connection.OpenAsync();

            var fakeProvider = new TrackingFakeAiAnalysisProvider();
            var factory = new OperationalWebApplicationFactory(connection, fakeProvider);

            await using (var scope = factory.Services.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
                await db.Database.EnsureCreatedAsync();

                var now = new DateTime(2026, 11, 24, 0, 0, 0, DateTimeKind.Utc);

                db.Areas.Add(new Area
                {
                    AreaId = SyntheticAreaId,
                    AreaName = "Synthetic Operational District",
                    AreaType = "District",
                    IsActive = true
                });

                db.Users.AddRange(
                    new User
                    {
                        UserId = CitizenUserId,
                        FullName = "Synthetic Citizen",
                        Email = "synthetic.citizen.ops@test.local",
                        PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new User
                    {
                        UserId = AdminUserId,
                        FullName = "Synthetic Ops Admin",
                        Email = "synthetic.admin.ops@test.local",
                        PasswordHash = "SYNTHETIC-HASH-NOT-A-SECRET",
                        IsActive = true,
                        CreatedAt = now
                    });

                // RoleId 1 = Citizen (no operational manage permissions)
                // RoleId 2 = Administrator (has Resources.Allocate, ResourceAllocations.Manage, Shelters.Manage, Volunteers.Manage)
                db.UserRoles.AddRange(
                    new UserRole { UserId = CitizenUserId, RoleId = 1 },
                    new UserRole { UserId = AdminUserId, RoleId = 2 });

                db.CrisisEvents.AddRange(
                    new CrisisEvent
                    {
                        CrisisId = ActiveCrisisId,
                        CrisisName = "Synthetic Flood Response 2026",
                        CrisisType = "Flood",
                        Description = "Synthetic active crisis for workflow testing.",
                        SeverityLevel = "High",
                        StartDate = now,
                        Status = "Active"
                    },
                    new CrisisEvent
                    {
                        CrisisId = ClosedCrisisId,
                        CrisisName = "Synthetic Archived Event",
                        CrisisType = "Storm",
                        Description = "Synthetic closed crisis for negative validation.",
                        SeverityLevel = "Low",
                        StartDate = now.AddDays(-30),
                        Status = "Closed"
                    });

                db.CitizenRequests.Add(new CitizenRequest
                {
                    RequestId = SyntheticCitizenRequestId,
                    UserId = CitizenUserId,
                    AreaId = SyntheticAreaId,
                    CrisisId = ActiveCrisisId,
                    RequestType = "Food",
                    Description = "Synthetic household relief request.",
                    UrgencyLevel = "High",
                    PeopleCount = 6,
                    Status = "Pending",
                    Address = "Synthetic Zone B",
                    CreatedAt = now
                });

                db.Resources.Add(new Resource
                {
                    ResourceId = SyntheticResourceId,
                    ResourceName = "Synthetic Dry Rations Pack",
                    ResourceCategory = "Food",
                    UnitOfMeasure = "Pack",
                    IsPerishable = false,
                    IsActive = true,
                    CreatedAt = now
                });

                db.Warehouses.Add(new Warehouse
                {
                    WarehouseId = SyntheticWarehouseId,
                    WarehouseName = "Synthetic Central Depot",
                    WarehouseCode = "SYN-WH-01",
                    Address = "Synthetic Logistics Hub",
                    AreaId = SyntheticAreaId,
                    IsActive = true,
                    CreatedAt = now
                });

                db.WarehouseInventories.Add(new WarehouseInventory
                {
                    InventoryId = SyntheticInventoryId,
                    WarehouseId = SyntheticWarehouseId,
                    ResourceId = SyntheticResourceId,
                    QuantityAvailable = initialStock,
                    ReorderLevel = 10m,
                    LastUpdatedAt = now
                });

                db.Shelters.AddRange(
                    new Shelter
                    {
                        ShelterId = OpenShelterId,
                        ShelterName = "Synthetic Relief Camp Alpha",
                        AreaId = SyntheticAreaId,
                        Address = "Synthetic High Ground Road",
                        Capacity = shelterCapacity,
                        CurrentOccupancy = shelterOccupancy,
                        Status = shelterOccupancy >= shelterCapacity ? "Full" : "Open",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new Shelter
                    {
                        ShelterId = ClosedShelterId,
                        ShelterName = "Synthetic Closed Camp Beta",
                        AreaId = SyntheticAreaId,
                        Address = "Synthetic Old Hall",
                        Capacity = 20,
                        CurrentOccupancy = 0,
                        Status = "Closed",
                        IsActive = true,
                        CreatedAt = now
                    });

                db.Volunteers.AddRange(
                    new Volunteer
                    {
                        VolunteerId = ApprovedVolunteerId,
                        FullName = "Synthetic Approved Volunteer",
                        Email = "synthetic.vol.approved@test.local",
                        AreaId = SyntheticAreaId,
                        Skills = "First Aid, Logistics",
                        AvailabilityStatus = "Available",
                        ApprovalStatus = "Approved",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new Volunteer
                    {
                        VolunteerId = PendingVolunteerId,
                        FullName = "Synthetic Pending Volunteer",
                        Email = "synthetic.vol.pending@test.local",
                        AreaId = SyntheticAreaId,
                        Skills = "Transport",
                        AvailabilityStatus = "Available",
                        ApprovalStatus = "Pending",
                        IsActive = true,
                        CreatedAt = now
                    },
                    new Volunteer
                    {
                        VolunteerId = UnavailableVolunteerId,
                        FullName = "Synthetic Unavailable Volunteer",
                        Email = "synthetic.vol.unavailable@test.local",
                        AreaId = SyntheticAreaId,
                        Skills = "Medical",
                        AvailabilityStatus = "Unavailable",
                        ApprovalStatus = "Approved",
                        IsActive = true,
                        CreatedAt = now
                    });

                await db.SaveChangesAsync();
            }

            return new OperationalApiTestEnvironment(connection, factory, fakeProvider);
        }

        public HttpClient CreateAnonymousClient()
        {
            return _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
                AllowAutoRedirect = false
            });
        }

        public HttpClient CreateAuthenticatedClient(int userId)
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var jwtTokenService = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();

            var user = db.Users
                .AsNoTracking()
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .Single(u => u.UserId == userId);

            var auth = jwtTokenService.GenerateToken(user);

            var client = CreateAnonymousClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", auth.AccessToken);
            return client;
        }

        public AsyncServiceScope CreateVerificationScope() => _factory.Services.CreateAsyncScope();

        public async ValueTask DisposeAsync()
        {
            await _factory.DisposeAsync();
            await _connection.DisposeAsync();
        }
    }

    private sealed class OperationalWebApplicationFactory : WebApplicationFactory<Program>
    {
        private const string TestIssuer = "HumanitarianCrisisManagementAPI.OpsTest";
        private const string TestAudience = "HumanitarianCrisisManagementClient.OpsTest";

        private readonly SqliteConnection _connection;
        private readonly TrackingFakeAiAnalysisProvider _fakeAiProvider;
        private readonly string _ephemeralJwtKeyBase64;

        public OperationalWebApplicationFactory(
            SqliteConnection connection,
            TrackingFakeAiAnalysisProvider fakeAiProvider)
        {
            _connection = connection;
            _fakeAiProvider = fakeAiProvider;

            var keyBytes = new byte[32];
            RandomNumberGenerator.Fill(keyBytes);
            _ephemeralJwtKeyBase64 = Convert.ToBase64String(keyBytes);
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.UseSetting("ConnectionStrings:DefaultConnection", "DataSource=:memory:");
            builder.UseSetting("Jwt:Key", _ephemeralJwtKeyBase64);
            builder.UseSetting("Jwt:Issuer", TestIssuer);
            builder.UseSetting("Jwt:Audience", TestAudience);
            builder.UseSetting("Jwt:AccessTokenExpirationMinutes", "30");
            builder.UseSetting("AiProvider:Provider", "None");
            builder.UseSetting("AiProvider:GroqApiKey", string.Empty);
            builder.UseSetting("AiProvider:GeminiApiKey", string.Empty);
            builder.UseSetting("AiProvider:IncludeSanitizedDescriptions", "false");

            builder.ConfigureAppConfiguration((_, configBuilder) =>
            {
                configBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                    ["Jwt:Key"] = _ephemeralJwtKeyBase64,
                    ["Jwt:Issuer"] = TestIssuer,
                    ["Jwt:Audience"] = TestAudience,
                    ["Jwt:AccessTokenExpirationMinutes"] = "30",
                    ["AiProvider:Provider"] = "None",
                    ["AiProvider:GroqApiKey"] = string.Empty,
                    ["AiProvider:GeminiApiKey"] = string.Empty,
                    ["AiProvider:IncludeSanitizedDescriptions"] = "false"
                });
            });

            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<DbContextOptions<ApplicationDbContext>>();
                services.RemoveAll<IDbContextOptionsConfiguration<ApplicationDbContext>>();
                services.RemoveAll<ApplicationDbContext>();

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseSqlite(_connection));

                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    options.TokenValidationParameters.IssuerSigningKey =
                        new SymmetricSecurityKey(Convert.FromBase64String(_ephemeralJwtKeyBase64));
                    options.TokenValidationParameters.ValidIssuer = TestIssuer;
                    options.TokenValidationParameters.ValidAudience = TestAudience;
                });

                services.RemoveAll<IAiAnalysisProvider>();
                services.AddSingleton<IAiAnalysisProvider>(_fakeAiProvider);
            });
        }
    }

    private sealed class TrackingFakeAiAnalysisProvider : IAiAnalysisProvider
    {
        public int CallCount { get; private set; }
        public bool IsConfigured => false;
        public string ProviderName => "TestFake";

        public Task<AiAnalysisResult> AnalyzeCitizenRequestAsync(
            AiAnalysisContext context,
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            throw new InvalidOperationException("External AI provider must never be called during operational workflow tests.");
        }

        public Task<AiProviderDiagnosticResponse> RunConnectivityDiagnosticAsync(
            CancellationToken cancellationToken = default)
        {
            CallCount++;
            throw new InvalidOperationException("External AI diagnostic must never be called during operational workflow tests.");
        }
    }
}
