package com.waad.tba.modules.settlement.api.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║          SETTLEMENT BATCH RESPONSE - API CONTRACT v1                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * PUBLIC API CONTRACT for settlement batch responses.
 * 
 * DESIGN PRINCIPLES:
 * ✓ Read-only - no setters needed
 * ✓ Complete audit trail
 * ✓ All financial amounts included
 * ✓ Status transitions tracked
 * ✓ Immutable after PAID status
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Settlement batch details response")
public class SettlementBatchResponse {

    // ═══════════════════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(description = "Unique batch ID", example = "1001")
    private Long batchId;
    
    @Schema(description = "Unique batch number", example = "STL-2026-000001")
    private String batchNumber;
    
    @Schema(description = "Provider ID", example = "123")
    private Long providerId;
    
    @Schema(description = "Provider name", example = "Al-Shifa Hospital")
    private String providerName;
    
    @Schema(description = "Settlement date", example = "2026-01-15")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate settlementDate;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(
        description = "Batch status",
        example = "CONFIRMED",
        allowableValues = {"DRAFT", "CONFIRMED", "PAID"}
    )
    private String status;
    
    @Schema(description = "Status in Arabic", example = "مؤكد")
    private String statusArabic;
    
    @Schema(description = "Indicates if batch can be modified", example = "false")
    private boolean modifiable;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FINANCIAL AMOUNTS (BACKEND-CALCULATED - IMMUTABLE)
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(description = "Number of claims in batch", example = "25")
    private Integer claimCount;
    
    @Schema(description = "Total gross amount (sum of requested amounts)", example = "125000.00")
    private BigDecimal totalGrossAmount;
    
    @Schema(description = "Total net amount to be paid to provider", example = "110000.00")
    private BigDecimal totalNetAmount;
    
    @Schema(description = "Total patient share (copayments)", example = "15000.00")
    private BigDecimal totalPatientShare;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PAYMENT DETAILS (populated when status = PAID)
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(description = "Payment reference number", example = "TRF-2026-001234")
    private String paymentReference;
    
    @Schema(
        description = "Payment method",
        example = "BANK_TRANSFER",
        allowableValues = {"BANK_TRANSFER", "CHECK", "CASH"}
    )
    private String paymentMethod;
    
    @Schema(description = "Actual payment date", example = "2026-01-20")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate paymentDate;
    
    @Schema(description = "Bank account number used", example = "SA1234567890123456789012")
    private String bankAccountNumber;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH METADATA
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(description = "Batch description/notes", example = "January 2026 settlements")
    private String description;
    
    @Schema(description = "Cancellation reason (if cancelled)", example = "Provider requested revision")
    private String cancellationReason;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIMS IN BATCH (Optional - include based on request parameter)
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(description = "List of claims in the batch (optional)")
    private List<BatchClaimItemResponse> claims;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT TRAIL (Complete lifecycle tracking)
    // ═══════════════════════════════════════════════════════════════════════════
    
    @Schema(description = "User ID who created the batch", example = "5")
    private Long createdBy;
    
    @Schema(description = "User name who created the batch", example = "Ahmed Al-Salem")
    private String createdByName;
    
    @Schema(description = "Creation timestamp", example = "2026-01-10T10:30:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @Schema(description = "User ID who confirmed the batch", example = "6")
    private Long confirmedBy;
    
    @Schema(description = "User name who confirmed the batch", example = "Fatima Al-Mutairi")
    private String confirmedByName;
    
    @Schema(description = "Confirmation timestamp", example = "2026-01-15T14:20:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime confirmedAt;
    
    @Schema(description = "User ID who paid the batch", example = "7")
    private Long paidBy;
    
    @Schema(description = "User name who paid the batch", example = "Mohammed Al-Rashid")
    private String paidByName;
    
    @Schema(description = "Payment timestamp", example = "2026-01-20T09:45:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime paidAt;
    
    @Schema(description = "User ID who cancelled the batch", example = "8")
    private Long cancelledBy;
    
    @Schema(description = "User name who cancelled the batch", example = "Sara Al-Harbi")
    private String cancelledByName;
    
    @Schema(description = "Cancellation timestamp", example = "2026-01-12T11:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime cancelledAt;
}
