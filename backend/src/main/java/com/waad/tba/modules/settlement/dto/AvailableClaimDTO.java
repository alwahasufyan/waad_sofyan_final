package com.waad.tba.modules.settlement.dto;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for claims available for settlement batching.
 * Contains minimal fields needed for batch creation UI.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableClaimDTO {
    
    private Long id;
    private String claimNumber;
    private Long memberId;
    private String memberName;
    private String memberNationalNumber;
    private Long providerId;
    private String providerName;
    private LocalDate serviceDate;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private ClaimStatus status;
    private String statusLabel;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    
    /**
     * Create DTO from Claim entity
     */
    public static AvailableClaimDTO fromClaim(Claim claim) {
        return AvailableClaimDTO.builder()
                .id(claim.getId())
                .claimNumber("CLM-" + claim.getId())
                .memberId(claim.getMember() != null ? claim.getMember().getId() : null)
                .memberName(claim.getMember() != null ? claim.getMember().getFullName() : "غير محدد")
                .memberNationalNumber(claim.getMember() != null ? claim.getMember().getNationalNumber() : null)
                .providerId(claim.getProviderId())
                .providerName(claim.getProviderName())
                .serviceDate(claim.getServiceDate())
                .requestedAmount(claim.getRequestedAmount())
                .approvedAmount(claim.getApprovedAmount())
                .status(claim.getStatus())
                .statusLabel(claim.getStatus() != null ? claim.getStatus().getArabicLabel() : null)
                .createdAt(claim.getCreatedAt())
                .approvedAt(claim.getReviewedAt())
                .build();
    }
}
