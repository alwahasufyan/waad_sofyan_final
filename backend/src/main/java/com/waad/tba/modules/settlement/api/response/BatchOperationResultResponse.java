package com.waad.tba.modules.settlement.api.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║          BATCH OPERATION RESULT RESPONSE - API CONTRACT v1                    ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Response for batch modification operations (add/remove claims).
 * 
 * DESIGN PRINCIPLES:
 * ✓ Clear success/failure feedback
 * ✓ Returns updated batch summary
 * ✓ Lists which claims were successfully processed
 * ✓ Indicates partial success scenarios
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Result of batch modification operation")
public class BatchOperationResultResponse {

    @Schema(description = "Number of claims requested", example = "10")
    private Integer requestedCount;
    
    @Schema(description = "Number of claims successfully processed", example = "8")
    private Integer successCount;
    
    @Schema(description = "Number of claims that failed", example = "2")
    private Integer failedCount;
    
    @Schema(description = "List of successfully processed claim IDs", example = "[789, 790, 791]")
    private List<Long> processedClaimIds;
    
    @Schema(description = "List of failed claim IDs with reasons")
    private List<FailedClaimDetail> failedClaims;
    
    @Schema(description = "Updated batch summary after operation")
    private SettlementBatchResponse batchSummary;
    
    @Schema(description = "Operation message", example = "تم إضافة 8 مطالبات بنجاح")
    private String message;
    
    /**
     * Details for claims that failed to process
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Details of a failed claim")
    public static class FailedClaimDetail {
        
        @Schema(description = "Claim ID", example = "792")
        private Long claimId;
        
        @Schema(description = "Failure reason", example = "Claim is already in batch STL-2026-000002")
        private String reason;
    }
}
