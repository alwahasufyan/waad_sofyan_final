package com.waad.tba.modules.member.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * ==================== UNIFIED MEMBER ARCHITECTURE ====================
 * Service to generate unified card numbers for members.
 * 
 * Card Number Strategy:
 * - PRINCIPAL: Base card number (6 digits, zero-padded)
 *   Example: 000001, 000123, 012345
 * 
 * - DEPENDENT: Principal's card number + suffix (2 digits)
 *   Example: 000123-01, 000123-02, 000123-03
 * 
 * Business Rules:
 * - Each family shares the same base card number
 * - Dependents get automatic suffix based on their order
 * - Suffix starts at 01 and increments
 * - Card numbers are UNIQUE system-wide
 * - Immutable after creation (cannot be changed)
 * 
 * Uses database sequence `member_card_number_seq` for principal card numbers.
 * =====================================================================
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CardNumberGeneratorService {

    @PersistenceContext
    private EntityManager entityManager;
    
    private final MemberRepository memberRepository;

    /**
     * Generate base card number for PRINCIPAL member.
     * 
     * Format: NNNNNN (6 digits, zero-padded)
     * Example: 000001, 000123, 012345
     * 
     * Uses database sequence for atomic increments.
     * 
     * @return Base card number for principal
     */
    @Transactional
    public String generateForPrincipal() {
        // Get next sequence value
        Number nextVal = (Number) entityManager
            .createNativeQuery("SELECT nextval('member_card_number_seq')")
            .getSingleResult();
        long seq = nextVal.longValue();
        
        // Format: NNNNNN (6 digits)
        String cardNumber = String.format("%06d", seq);
        
        log.info("Generated card number for PRINCIPAL: {}", cardNumber);
        return cardNumber;
    }

    /**
     * Generate card number for DEPENDENT member.
     * 
     * Format: {principal_card_number}-{suffix}
     * Example: 000123-01, 000123-02, 000123-03
     * 
     * Suffix is auto-calculated based on existing dependents count.
     * 
     * @param principal The principal member (parent)
     * @return Card number with suffix
     */
    @Transactional(readOnly = true)
    public String generateForDependent(Member principal) {
        if (principal == null) {
            throw new IllegalArgumentException("Principal member cannot be null");
        }
        
        if (principal.isDependent()) {
            throw new IllegalArgumentException(
                "Cannot generate dependent card number: provided member is already a dependent. " +
                "Dependents cannot have sub-dependents."
            );
        }
        
        String principalCardNumber = principal.getCardNumber();
        if (principalCardNumber == null || principalCardNumber.trim().isEmpty()) {
            throw new IllegalStateException(
                "Principal member must have a card number before creating dependents"
            );
        }
        
        // Count existing dependents for this principal
        long dependentsCount = memberRepository.countByParentId(principal.getId());
        
        // Calculate next suffix (starts at 01)
        int nextSuffix = (int) dependentsCount + 1;
        
        // Format: {principal_card}-{suffix}
        String cardNumber = String.format("%s-%02d", principalCardNumber, nextSuffix);
        
        log.info("Generated card number for DEPENDENT of principal {}: {}", 
                 principal.getId(), cardNumber);
        
        return cardNumber;
    }

    /**
     * Generate unique card number for principal with collision prevention.
     * 
     * Recommended for use in high-concurrency environments.
     * 
     * @return Guaranteed unique card number
     * @throws IllegalStateException if unable to generate unique card number
     */
    @Transactional
    public String generateUniqueForPrincipal() {
        String cardNumber;
        int attempts = 0;
        final int MAX_ATTEMPTS = 100;
        
        do {
            cardNumber = generateForPrincipal();
            attempts++;
            
            if (attempts >= MAX_ATTEMPTS) {
                log.error("Failed to generate unique card number for Principal after {} attempts", MAX_ATTEMPTS);
                throw new IllegalStateException(
                    "Unable to generate unique card number for Principal after " + MAX_ATTEMPTS + " attempts. " +
                    "This indicates a critical system issue."
                );
            }
            
            // Check if card number already exists
        } while (memberRepository.existsByCardNumber(cardNumber));
        
        if (attempts > 1) {
            log.warn("Generated unique card number for Principal after {} attempts: {}", attempts, cardNumber);
        } else {
            log.debug("Generated unique card number for Principal on first attempt: {}", cardNumber);
        }
        
        return cardNumber;
    }

    /**
     * Validate card number format.
     * 
     * Valid formats:
     * - Principal: NNNNNN (exactly 6 digits)
     * - Dependent: NNNNNN-NN (6 digits, hyphen, 2 digits)
     * 
     * @param cardNumber Card number to validate
     * @return true if valid, false otherwise
     */
    public boolean isValidCardNumberFormat(String cardNumber) {
        if (cardNumber == null || cardNumber.trim().isEmpty()) {
            return false;
        }
        
        // Principal format: exactly 6 digits
        if (cardNumber.matches("^\\d{6}$")) {
            return true;
        }
        
        // Dependent format: 6 digits, hyphen, 2 digits
        if (cardNumber.matches("^\\d{6}-\\d{2}$")) {
            return true;
        }
        
        return false;
    }

    /**
     * Check if card number belongs to a principal (no suffix).
     * 
     * @param cardNumber Card number to check
     * @return true if principal card number, false if dependent
     */
    public boolean isPrincipalCardNumber(String cardNumber) {
        if (cardNumber == null) {
            return false;
        }
        return cardNumber.matches("^\\d{6}$");
    }

    /**
     * Extract base card number from dependent card number.
     * 
     * Example: "000123-01" → "000123"
     * 
     * @param dependentCardNumber Dependent's card number
     * @return Base card number (principal's card number)
     */
    public String extractBaseCardNumber(String dependentCardNumber) {
        if (dependentCardNumber == null || !dependentCardNumber.contains("-")) {
            return dependentCardNumber;
        }
        return dependentCardNumber.split("-")[0];
    }
}
