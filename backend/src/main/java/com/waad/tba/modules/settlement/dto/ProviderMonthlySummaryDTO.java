package com.waad.tba.modules.settlement.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderMonthlySummaryDTO {
    private Long providerId;
    private Integer year;
    private Integer month;
    private BigDecimal approvedAmount;
    private BigDecimal paidAmount;
    private BigDecimal remainingAmount;
    private boolean locked;
}
