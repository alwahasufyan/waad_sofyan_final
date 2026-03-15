package com.waad.tba.modules.settlement.event;

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
 * Event Listener for Claim Reversal → Provider Account Debit
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║ CLAIM REVERSAL EVENT LISTENER ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Debits the provider account when an approved claim is reversed to REJECTED.
 * ║
 * ║ ║
 * ║ TRIGGERS: ║
 * ║ When: ClaimReversalEvent is published (APPROVED → REJECTED transition) ║
 * ║ Phase: AFTER_COMMIT (ensures the rejection is committed before debit) ║
 * ║ ║
 * ║ FAILURE HANDLING: ║
 * ║ - Failures are logged as CRITICAL errors for manual intervention. ║
 * ║ - The rejection itself is NOT rolled back (it already committed). ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ClaimReversalEventListener {

    private final ProviderAccountService providerAccountService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleClaimReversal(ClaimReversalEvent event) {
        log.info("🔄 [EVENT] Processing ClaimReversalEvent: claimId={}, providerId={}",
                event.getClaimId(), event.getProviderId());

        if (event.getProviderId() == null) {
            log.warn("⚠️ [EVENT] Skipping reversal debit - provider ID is null for claim {}", event.getClaimId());
            return;
        }

        try {
            providerAccountService.debitOnClaimReversal(event.getClaimId(), event.getUserId());
            log.info("✅ [EVENT] Provider account debited (reversal) for claim {}", event.getClaimId());
        } catch (Exception e) {
            log.error("🚨 [CRITICAL] Failed to debit provider account for reversal of claim {}. " +
                    "Balance inconsistency requires manual correction! Error: {}",
                    event.getClaimId(), e.getMessage(), e);
        }
    }
}
