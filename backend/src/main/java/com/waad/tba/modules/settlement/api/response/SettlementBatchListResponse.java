package com.waad.tba.modules.settlement.api.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║          BATCH LIST RESPONSE - API CONTRACT v1                                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Paginated list of settlement batches with summary information.
 * 
 * DESIGN PRINCIPLES:
 * ✓ Lightweight summaries for list view
 * ✓ Pagination support
 * ✓ Filtering and sorting metadata
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Paginated list of settlement batches")
public class SettlementBatchListResponse {

    @Schema(description = "List of batch summaries")
    private List<BatchSummaryItem> batches;
    
    @Schema(description = "Current page number (0-based)", example = "0")
    private Integer currentPage;
    
    @Schema(description = "Page size", example = "20")
    private Integer pageSize;
    
    @Schema(description = "Total number of batches", example = "45")
    private Long totalElements;
    
    @Schema(description = "Total number of pages", example = "3")
    private Integer totalPages;
    
    @Schema(description = "Whether this is the first page", example = "true")
    private Boolean first;
    
    @Schema(description = "Whether this is the last page", example = "false")
    private Boolean last;
    
    /**
     * Lightweight batch summary for list views
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Batch summary item for list view")
    public static class BatchSummaryItem {
        
        @Schema(description = "Batch ID", example = "1001")
        private Long batchId;
        
        @Schema(description = "Batch number", example = "STL-2026-000001")
        private String batchNumber;
        
        @Schema(description = "Provider name", example = "Al-Shifa Hospital")
        private String providerName;
        
        @Schema(description = "Batch status", example = "CONFIRMED")
        private String status;
        
        @Schema(description = "Status in Arabic", example = "مؤكد")
        private String statusArabic;
        
        @Schema(description = "Number of claims", example = "25")
        private Integer claimCount;
        
        @Schema(description = "Total net amount", example = "110000.00")
        private BigDecimal totalNetAmount;
        
        @Schema(description = "Payment reference (if paid)", example = "TRF-2026-001234")
        private String paymentReference;
        
        @Schema(description = "Created by user name", example = "Ahmed Al-Salem")
        private String createdByName;
        
        @Schema(description = "Creation date", example = "2026-01-10")
        private String createdAt;
        
        @Schema(description = "Indicates if batch can be modified", example = "false")
        private Boolean modifiable;
    }
}
