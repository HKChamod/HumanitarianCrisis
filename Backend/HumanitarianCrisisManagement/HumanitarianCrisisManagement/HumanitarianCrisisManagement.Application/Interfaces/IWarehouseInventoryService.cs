using HumanitarianCrisisManagement.Application.DTOs.WarehouseInventories;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IWarehouseInventoryService
{
    Task<WarehouseInventoryResponse> CreateAsync(
        CreateWarehouseInventoryRequest request);

    Task<IReadOnlyList<WarehouseInventoryResponse>> GetAllAsync();

    Task<IReadOnlyList<WarehouseInventoryResponse>> GetByWarehouseIdAsync(
        int warehouseId);

    Task<WarehouseInventoryResponse> GetByIdAsync(int id);

    Task<WarehouseInventoryResponse> UpdateReorderLevelAsync(
        int id,
        UpdateWarehouseInventoryRequest request);

    Task DeleteAsync(int id);
}