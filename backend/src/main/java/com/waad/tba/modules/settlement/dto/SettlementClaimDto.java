package com.waad.tba.modules.settlement.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Generic settlement claim DTO.
 * Kept as a lightweight transfer object for settlement-related projections.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettlementClaimDto {

    private Long claimId;
    private String claimNumber;
    private String memberName;
    private String memberNationalNumber;
    private LocalDate serviceDate;

    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private BigDecimal patientShare;
    private BigDecimal rejectedAmount;

    private String status;
}
