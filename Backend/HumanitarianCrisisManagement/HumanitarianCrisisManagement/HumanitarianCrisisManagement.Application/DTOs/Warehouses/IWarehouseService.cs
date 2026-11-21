using HumanitarianCrisisManagement.Application.DTOs.Warehouses;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IWarehouseService
{
    Task<WarehouseResponse> CreateAsync(CreateWarehouseRequest request);

    Task<IReadOnlyList<WarehouseResponse>> GetAllAsync();

    Task<WarehouseResponse> GetByIdAsync(int id);

    Task<WarehouseResponse> UpdateAsync(int id, UpdateWarehouseRequest request);

    Task DeleteAsync(int id);
}