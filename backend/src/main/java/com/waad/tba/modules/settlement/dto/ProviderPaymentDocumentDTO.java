package com.waad.tba.modules.settlement.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderPaymentDocumentDTO {
    private Long id;
    private Long providerId;
    private Integer year;
    private Integer month;
    private String documentType;
    private String status;
    private String receiptNumber;
    private String paymentReference;
    private BigDecimal amount;
    private LocalDate paymentDate;
    private String notes;
    private Long accountTransactionId;
    private Long supersededById;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
