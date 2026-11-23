using HumanitarianCrisisManagement.Application.DTOs.Donations;

namespace HumanitarianCrisisManagement.Application.Interfaces;

public interface IDonationService
{
    Task<IReadOnlyList<DonationResponse>> GetAllAsync(string? donationType = null, string? status = null);
    Task<DonationResponse> GetByIdAsync(int donationId);
    Task<DonationResponse> CreateAsync(CreateDonationRequest request, int? actorUserId);
    Task<DonationResponse> VerifyAsync(int donationId, VerifyDonationRequest request, int actorUserId);
}
