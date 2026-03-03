package com.waad.tba.modules.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderPaymentDTO {
    private Long paymentId;
    private Long batchId;
    private String batchNumber;
    private Long providerId;
    private String providerName;
    private BigDecimal amount;
    private String paymentReference;
    private String paymentMethod;
    private LocalDateTime paymentDate;
    private String notes;
    private Long createdBy;
    private LocalDateTime createdAt;
}
