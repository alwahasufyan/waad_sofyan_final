package com.waad.tba.modules.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchItemDetailsDTO {
    private Long id;
    private Long claimId;
    private String claimNumber;
    private String memberName;
    private LocalDate serviceDate;
    private BigDecimal approvedAmount;
    private String claimStatus;
}
