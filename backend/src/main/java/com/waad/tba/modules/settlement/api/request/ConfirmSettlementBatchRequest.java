package com.waad.tba.modules.settlement.api.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           CONFIRM SETTLEMENT BATCH REQUEST - API CONTRACT v1                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * PUBLIC API CONTRACT for confirming a settlement batch (DRAFT → CONFIRMED).
 * 
 * BUSINESS RULES (Backend enforced):
 * ✓ Batch must be in DRAFT status
 * ✓ Batch must contain at least one claim
 * ✓ Batch becomes immutable after confirmation
 * ✓ Transitions to CONFIRMED status
 * 
 * @since API v1
 * @see SETTLEMENT_API_CONTRACT.md
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Request to confirm a settlement batch")
public class ConfirmSettlementBatchRequest {

    /**
     * Optional confirmation notes.
     * Maximum 500 characters.
     */
    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    @Schema(
        description = "Optional confirmation notes",
        example = "Verified all claim amounts. Ready for payment processing.",
        maxLength = 500
    )
    private String confirmationNotes;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EXPLICITLY FORBIDDEN FIELDS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // ❌ NO status - set by backend
    // ❌ NO confirmedBy - extracted from JWT
    // ❌ NO confirmedAt - set by backend
    // ❌ NO financial amounts - already locked
}
