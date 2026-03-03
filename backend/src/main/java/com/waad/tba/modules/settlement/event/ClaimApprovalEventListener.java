package com.waad.tba.modules.settlement.event;

import com.waad.tba.modules.settlement.entity.AccountTransaction;
import com.waad.tba.modules.settlement.service.ProviderAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Event Listener for Claim Approval → Provider Account Credit
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                   CLAIM APPROVAL EVENT LISTENER                               ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Automatically credits provider account when a claim is approved.              ║
 * ║                                                                               ║
 * ║ TRIGGERS:                                                                     ║
 * ║   When: ClaimApprovedEvent is published (after claim saved with APPROVED)     ║
 * ║   Phase: AFTER_COMMIT (ensures claim save is committed first)                 ║
 * ║                                                                               ║
 * ║ ACTIONS:                                                                      ║
 * ║   1. Get the approved claim                                                   ║
 * ║   2. Credit provider account with net provider amount                         ║
 * ║   3. Create CREDIT transaction record                                         ║
 * ║                                                                               ║
 * ║ PROTECTIONS:                                                                  ║
 * ║   - Double Credit Prevention (checked in ProviderAccountService)              ║
 * ║   - Runs in separate transaction (REQUIRES_NEW)                               ║
 * ║   - Async execution (does not block approval response)                        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 * 
 * @since Phase 3A - Backend Integration
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClaimApprovalEventListener {

    private final ProviderAccountService providerAccountService;

    /**
     * Handle claim approval event - Credit provider account.
     * 
     * Executes AFTER the approval transaction commits successfully.
     * Uses separate transaction to ensure idempotency.
     * 
     * @param event The claim approved event containing claimId and providerId
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleClaimApproved(ClaimApprovedEvent event) {
        log.info("🎯 [EVENT] Processing ClaimApprovedEvent: claimId={}, providerId={}", 
            event.getClaimId(), event.getProviderId());
        
        // Skip if provider ID is missing
        if (event.getProviderId() == null) {
            log.warn("⚠️ [EVENT] Skipping credit - provider ID is null for claim {}", 
                event.getClaimId());
            return;
        }
        
        try {
            // Credit the provider account
            // ProviderAccountService handles:
            // - Double credit prevention (checks if transaction exists)
            // - Validation of claim status
            // - Creation of CREDIT transaction
            // - Account balance update
            AccountTransaction transaction = providerAccountService.creditOnClaimApproval(
                event.getClaimId(), 
                event.getUserId()
            );
            
            log.info("✅ [EVENT] Provider account credited successfully: " +
                    "claimId={}, transactionId={}, amount={}, newBalance={}", 
                event.getClaimId(),
                transaction.getId(),
                transaction.getAmount(),
                transaction.getBalanceAfter()
            );
            
        } catch (IllegalStateException e) {
            // Expected case: Claim already credited (idempotency protection)
            if (e.getMessage().contains("already been credited")) {
                log.warn("⚠️ [EVENT] Claim {} already credited - skipping (idempotent)", 
                    event.getClaimId());
            } else {
                log.error("❌ [EVENT] Failed to credit provider account for claim {}: {}", 
                    event.getClaimId(), e.getMessage());
                throw e; // Re-throw to mark transaction for rollback
            }
        } catch (Exception e) {
            log.error("❌ [EVENT] Unexpected error crediting provider account for claim {}: {}", 
                event.getClaimId(), e.getMessage(), e);
            throw e; // Re-throw to mark transaction for rollback
        }
    }
}
