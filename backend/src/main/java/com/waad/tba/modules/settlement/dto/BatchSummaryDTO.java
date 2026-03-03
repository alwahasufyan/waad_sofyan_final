package com.waad.tba.modules.settlement.dto;

import com.waad.tba.modules.settlement.entity.SettlementBatchItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Batch Summary DTO
 * 
 * Comprehensive view of a settlement batch.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BatchSummaryDTO {

    private Long batchId;
    private String batchNumber;
    private Long providerId;
    private String providerName;
    
    private String status;
    private String statusArabic;
    
    private int claimCount;
    private BigDecimal totalGrossAmount;
    private BigDecimal totalNetAmount;
    private BigDecimal totalPatientShare;
    
    private String description;
    private String paymentReference;
    
    /**
     * List of claims in the batch
     */
    private List<SettlementBatchItem> items;
    
    // Audit trail
    private Long createdBy;
    private LocalDateTime createdAt;
    
    private Long confirmedBy;
    private LocalDateTime confirmedAt;
    
    private Long paidBy;
    private LocalDateTime paidAt;
    
    private Long cancelledBy;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
}
