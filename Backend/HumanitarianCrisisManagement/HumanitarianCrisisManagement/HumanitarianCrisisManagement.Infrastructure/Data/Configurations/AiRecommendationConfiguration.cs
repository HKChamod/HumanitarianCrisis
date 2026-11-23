using HumanitarianCrisisManagement.Domain.Entities;
using HumanitarianCrisisManagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HumanitarianCrisisManagement.Infrastructure.Data.Configurations;

public class AiRecommendationConfiguration : IEntityTypeConfiguration<AiRecommendation>
{
    public void Configure(EntityTypeBuilder<AiRecommendation> builder)
    {
        builder.ToTable("AiRecommendations", t =>
        {
            t.HasCheckConstraint(
                "CK_AiRecommendations_ConfidenceScore",
                "[ConfidenceScore] >= 0 AND [ConfidenceScore] <= 1");
            t.HasCheckConstraint(
                "CK_AiRecommendations_SuggestedResourceQuantity",
                "[SuggestedResourceQuantity] IS NULL OR [SuggestedResourceQuantity] > 0");
        });

        builder.HasKey(r => r.RecommendationId);

        builder.Property(r => r.SuggestedCategory)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(r => r.SuggestedUrgencyLevel)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(r => r.SuggestedResourceQuantity)
            .HasPrecision(18, 2);

        builder.Property(r => r.ConfidenceScore)
            .HasPrecision(5, 4)
            .IsRequired();

        builder.Property(r => r.Explanation)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(r => r.ProviderName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.ModelVersion)
            .HasMaxLength(100);

        builder.Property(r => r.ReviewStatus)
            .HasConversion<string>()
            .HasMaxLength(20)
            .HasDefaultValue(AiRecommendationReviewStatus.PendingReview)
            .IsRequired();

        builder.Property(r => r.HumanDecisionNote)
            .HasMaxLength(1000);

        builder.Property(r => r.OverriddenCategory)
            .HasMaxLength(50);

        builder.Property(r => r.OverriddenUrgencyLevel)
            .HasMaxLength(20);

        builder.Property(r => r.CreatedAt)
            .IsRequired();

        builder.HasOne(r => r.CitizenRequest)
            .WithMany()
            .HasForeignKey(r => r.CitizenRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.CrisisEvent)
            .WithMany()
            .HasForeignKey(r => r.CrisisId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.DuplicateOfRequest)
            .WithMany()
            .HasForeignKey(r => r.DuplicateOfRequestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.SuggestedInventory)
            .WithMany()
            .HasForeignKey(r => r.SuggestedInventoryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(r => r.ReviewedByUser)
            .WithMany()
            .HasForeignKey(r => r.ReviewedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => r.CitizenRequestId);
        builder.HasIndex(r => r.CrisisId);
        builder.HasIndex(r => r.ReviewStatus);
        builder.HasIndex(r => r.CreatedAt);
    }
}
