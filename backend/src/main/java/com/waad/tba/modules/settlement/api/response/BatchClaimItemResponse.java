package com.waad.tba.modules.settlement.api.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           BATCH CLAIM ITEM RESPONSE - API CONTRACT v1                         ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Represents a single claim within a settlement batch.
 * 
 * DESIGN PRINCIPLES:
 * ✓ Read-only snapshot
 * ✓ Amounts frozen at batch creation time
 * ✓ Includes member details for verification
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Claim details within a settlement batch")
public class BatchClaimItemResponse {

    @Schema(description = "Claim ID", example = "456")
    private Long claimId;
    
    @Schema(description = "Claim number", example = "CLM-456")
    private String claimNumber;
    
    @Schema(description = "Member ID", example = "789")
    private Long memberId;
    
    @Schema(description = "Member name", example = "Abdullah Al-Qahtani")
    private String memberName;
    
    @Schema(description = "Member national number", example = "1234567890")
    private String memberNationalNumber;
    
    @Schema(description = "Service date", example = "2025-12-15")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate serviceDate;
    
    @Schema(description = "Diagnosis description", example = "Type 2 Diabetes Management")
    private String diagnosisDescription;
    
    // Financial amounts (frozen at batch creation)
    
    @Schema(description = "Requested amount", example = "5000.00")
    private BigDecimal requestedAmount;
    
    @Schema(description = "Approved amount", example = "4500.00")
    private BigDecimal approvedAmount;
    
    @Schema(description = "Net provider amount (payable)", example = "4200.00")
    private BigDecimal netProviderAmount;
    
    @Schema(description = "Patient copayment", example = "300.00")
    private BigDecimal patientShare;
    
    @Schema(description = "Deductions applied", example = "300.00")
    private BigDecimal deductions;
    
    @Schema(description = "Claim status", example = "BATCHED")
    private String status;
}
