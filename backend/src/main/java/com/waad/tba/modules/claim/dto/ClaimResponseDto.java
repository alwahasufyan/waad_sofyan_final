package com.waad.tba.modules.claim.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Simple DTO for Claim PDF reports
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimResponseDto {
    private Long id;
    private Long memberId;
    private String memberFullName;
    private String memberCivilId;
    private String insuranceCompanyName;
    private String providerName;
    private String doctorName;
    private String diagnosis;
    private LocalDate visitDate;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private BigDecimal differenceAmount;
    private BigDecimal patientCoPay;
    private BigDecimal netProviderAmount;
    private String status;
    private String statusLabel;
    private String reviewerComment;
    private LocalDateTime reviewedAt;
    private Integer serviceCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
