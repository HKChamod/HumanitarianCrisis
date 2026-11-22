using HumanitarianCrisisManagement.Application.DTOs.ResourceAllocations;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IResourceAllocationService
{
    Task<ResourceAllocationResponse> CreateAsync(
        CreateResourceAllocationRequest request,
        int requestedByUserId);

    Task<List<ResourceAllocationResponse>> GetAllAsync();

    Task<List<ResourceAllocationResponse>> GetMyAllocationsAsync(
        int userId);

    Task<ResourceAllocationResponse> GetByIdAsync(int id);

    Task<ResourceAllocationResponse> ApproveAsync(
        int id,
        UpdateResourceAllocationStatusRequest request,
        int approvedByUserId);

    Task<ResourceAllocationResponse> RejectAsync(
        int id,
        UpdateResourceAllocationStatusRequest request);

    Task<ResourceAllocationResponse> DispatchAsync(
        int id,
        UpdateResourceAllocationStatusRequest request,
        int performedByUserId);

    Task<ResourceAllocationResponse> DeliverAsync(
        int id,
        UpdateResourceAllocationStatusRequest request);

    Task<ResourceAllocationResponse> CancelAsync(
        int id,
        UpdateResourceAllocationStatusRequest request,
        int performedByUserId);
}
