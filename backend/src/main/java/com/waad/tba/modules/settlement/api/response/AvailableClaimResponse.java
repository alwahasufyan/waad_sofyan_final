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
 * ║          AVAILABLE CLAIM RESPONSE - API CONTRACT v1                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * Represents a claim available for settlement batching.
 * 
 * BUSINESS RULES:
 * ✓ Only APPROVED claims included
 * ✓ Not in any existing batch
 * ✓ Has valid net payable amount > 0
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Claim available for settlement batching")
public class AvailableClaimResponse {

    @Schema(description = "Claim ID", example = "789")
    private Long claimId;
    
    @Schema(description = "Claim number", example = "CLM-789")
    private String claimNumber;
    
    @Schema(description = "Member ID", example = "1011")
    private Long memberId;
    
    @Schema(description = "Member name", example = "Fatima Al-Harbi")
    private String memberName;
    
    @Schema(description = "Member national number", example = "9876543210")
    private String memberNationalNumber;
    
    @Schema(description = "Service date", example = "2026-01-05")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate serviceDate;
    
    @Schema(description = "Requested amount", example = "3500.00")
    private BigDecimal requestedAmount;
    
    @Schema(description = "Approved amount", example = "3200.00")
    private BigDecimal approvedAmount;
    
    @Schema(description = "Net payable to provider", example = "3000.00")
    private BigDecimal netPayableAmount;
    
    @Schema(description = "Claim status", example = "APPROVED")
    private String status;
    
    @Schema(description = "Status label in Arabic", example = "معتمد")
    private String statusLabel;
    
    @Schema(description = "Approval timestamp", example = "2026-01-08T14:30:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private String approvedAt;
}
