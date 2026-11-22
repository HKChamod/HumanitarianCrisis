using HumanitarianCrisisManagement.Application.DTOs.InventoryTransactions;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IInventoryTransactionService
{
    Task<InventoryTransactionResponse> CreateAsync(
        CreateInventoryTransactionRequest request,
        int performedByUserId);

    Task<IReadOnlyList<InventoryTransactionResponse>> GetAllAsync();

    Task<IReadOnlyList<InventoryTransactionResponse>> GetByInventoryIdAsync(
        int inventoryId);

    Task<InventoryTransactionResponse> GetByIdAsync(int id);

    Task<IReadOnlyList<InventoryTransactionResponse>> GetByTransferGroupIdAsync(
        Guid transferGroupId);

    Task<IReadOnlyList<InventoryTransactionResponse>> TransferAsync(
        TransferInventoryRequest request,
        int performedByUserId);
}
