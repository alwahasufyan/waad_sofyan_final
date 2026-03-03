package com.waad.tba.common.service;

import com.waad.tba.common.exception.ArchitecturalViolationException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicyRule;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.providercontract.entity.ProviderContractPricingItem;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Architectural Guard Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * SYSTEM INVARIANTS - NON-NEGOTIABLE RULES
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This service enforces architectural rules that must NEVER be violated.
 * These are system invariants, not business rules.
 * 
 * RULES ENFORCED:
 * 1. MedicalService must belong to a MedicalCategory
 * 2. Claim must be linked to a Visit
 * 3. Claim must have at least one MedicalService
 * 4. Contract Pricing must reference a MedicalService
 * 5. BenefitPolicyRule must target either Service OR Category
 * 6. PreAuthorization must be linked to a Visit
 * 7. Price must come from ProviderContract only
 * 8. Coverage must come from BenefitPolicy only
 * 
 * GOLDEN RULES:
 * - Service يُنفذ (executes)
 * - Category يُقرر (decides coverage)
 * - Policy يُحكم (governs limits)
 * - Contract يُسعّر (prices)
 * 
 * @version 1.0
 * @since 2026-01-22
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ArchitecturalGuardService {

    private final MedicalServiceRepository medicalServiceRepository;
    private final MedicalServiceCategoryRepository medicalServiceCategoryRepository;

    // ═══════════════════════════════════════════════════════════════════════════
    // MEDICAL SERVICE GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate MedicalService has a category.
     * RULE: Every MedicalService MUST belong to a MedicalCategory
     */
    public void guardServiceHasCategory(MedicalService service) {
        if (service == null) {
            throw new ArchitecturalViolationException("MedicalService", "Service cannot be null");
        }
        boolean hasCategory = service.getCategoryId() != null
            || medicalServiceCategoryRepository
                .findFirstByServiceIdAndActiveTrueOrderByIsPrimaryDescIdAsc(service.getId())
                .isPresent();

        if (!hasCategory) {
            throw ArchitecturalViolationException.serviceWithoutCategory(service.getCode());
        }
        log.trace("✅ Guard passed: Service {} has category (legacy or junction)", service.getCode());
    }

    /**
     * Validate service creation request has category
     */
    public void guardServiceCreateHasCategory(Long categoryId, String serviceCode) {
        if (categoryId == null) {
            throw ArchitecturalViolationException.serviceWithoutCategory(serviceCode);
        }
    }

    /**
     * Validate a service by ID has category assigned.
     * Used for pre-validation before entity access.
     */
    public void guardServiceHasCategory(Long serviceId) {
        if (serviceId == null) {
            return; // Skip null service IDs
        }
        medicalServiceRepository.findById(serviceId).ifPresent(service -> {
            boolean hasCategory = service.getCategoryId() != null
                || medicalServiceCategoryRepository
                    .findFirstByServiceIdAndActiveTrueOrderByIsPrimaryDescIdAsc(serviceId)
                    .isPresent();

            if (!hasCategory) {
                throw ArchitecturalViolationException.serviceWithoutCategory(service.getCode());
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CLAIM GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate Claim has a Visit.
     * RULE: Visit-centric architecture is mandatory
     */
    public void guardClaimHasVisit(Claim claim) {
        if (claim == null) {
            throw new ArchitecturalViolationException("Claim", "Claim cannot be null");
        }
        if (claim.getVisit() == null) {
            throw ArchitecturalViolationException.claimWithoutVisit(claim.getId());
        }
        log.trace("✅ Guard passed: Claim {} has visit {}", claim.getId(), claim.getVisit().getId());
    }

    /**
     * Validate visitId is provided for claim creation (ID-based).
     * Called before entity is created.
     */
    public void guardClaimHasVisit(Long visitId) {
        if (visitId == null) {
            throw ArchitecturalViolationException.claimWithoutVisit(null);
        }
    }

    /**
     * Validate Claim has at least one service.
     * RULE: Free-text services are not allowed
     */
    public void guardClaimHasServices(Claim claim, List<ClaimLine> lines) {
        if (claim == null) {
            throw new ArchitecturalViolationException("Claim", "Claim cannot be null");
        }
        if (lines == null || lines.isEmpty()) {
            throw ArchitecturalViolationException.claimWithoutService(claim.getId());
        }
        
        // Validate each line has a service
        for (ClaimLine line : lines) {
            if (line.getMedicalService() == null && (line.getServiceCode() == null || line.getServiceCode().isBlank())) {
                throw new ArchitecturalViolationException(
                    "INVALID_CLAIM_LINE",
                    "ClaimLine",
                    String.format("Claim %d line %d must reference a MedicalService. Free-text services are not allowed.",
                        claim.getId(), line.getId())
                );
            }
        }
        log.trace("✅ Guard passed: Claim {} has {} valid service lines", claim.getId(), lines.size());
    }

    /**
     * Validate service IDs provided for claim creation (ID-based).
     * Called before entity is created.
     */
    public void guardClaimHasServices(List<Long> serviceIds) {
        if (serviceIds == null || serviceIds.isEmpty()) {
            throw ArchitecturalViolationException.claimWithoutService(null);
        }
        // Also validate each service has a category
        for (Long serviceId : serviceIds) {
            guardServiceHasCategory(serviceId);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PREAUTHORIZATION GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate PreAuthorization has a Visit.
     * RULE: Standalone pre-authorizations are not allowed
     */
    public void guardPreAuthHasVisit(PreAuthorization preAuth) {
        if (preAuth == null) {
            throw new ArchitecturalViolationException("PreAuthorization", "PreAuthorization cannot be null");
        }
        if (preAuth.getVisit() == null) {
            throw ArchitecturalViolationException.preAuthWithoutVisit(preAuth.getReferenceNumber());
        }
        log.trace("✅ Guard passed: PreAuth {} has visit", preAuth.getReferenceNumber());
    }

    /**
     * Validate visitId is provided for preauth creation (ID-based).
     * Called before entity is created.
     */
    public void guardPreAuthHasVisit(Long visitId) {
        if (visitId == null) {
            throw ArchitecturalViolationException.preAuthWithoutVisit(null);
        }
    }

    /**
     * Validate PreAuthorization has a MedicalService.
     * RULE: PA must reference a system-defined service
     */
    public void guardPreAuthHasService(PreAuthorization preAuth) {
        if (preAuth == null) {
            throw new ArchitecturalViolationException("PreAuthorization", "PreAuthorization cannot be null");
        }
        if (preAuth.getMedicalService() == null && (preAuth.getServiceCode() == null || preAuth.getServiceCode().isBlank())) {
            throw new ArchitecturalViolationException(
                "SERVICE_REQUIRED",
                "PreAuthorization",
                String.format("PreAuthorization '%s' must reference a MedicalService. Free-text services are not allowed.",
                    preAuth.getReferenceNumber())
            );
        }
        log.trace("✅ Guard passed: PreAuth {} has service", preAuth.getReferenceNumber());
    }

    /**
     * Validate medicalServiceId is provided for preauth creation (ID-based).
     * Called before entity is created.
     */
    public void guardPreAuthHasService(Long medicalServiceId) {
        if (medicalServiceId == null) {
            throw new ArchitecturalViolationException(
                "SERVICE_REQUIRED",
                "PreAuthorization",
                "PreAuthorization must reference a MedicalService. Free-text services are not allowed."
            );
        }
        // Also validate the service has a category
        guardServiceHasCategory(medicalServiceId);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONTRACT PRICING GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate pricing item has a service.
     * RULE: Free-text pricing is not allowed
     */
    public void guardPricingHasService(ProviderContractPricingItem item) {
        if (item == null) {
            throw new ArchitecturalViolationException("ProviderContractPricingItem", "Pricing item cannot be null");
        }
        if (item.getMedicalService() == null) {
            throw ArchitecturalViolationException.pricingWithoutService(
                item.getContract() != null ? item.getContract().getId() : null
            );
        }
        log.trace("✅ Guard passed: Pricing item has service {}", item.getMedicalService().getCode());
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BENEFIT POLICY RULE GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Validate rule has a target (service or category).
     * RULE: Rules without targets cannot be used for coverage calculation
     */
    public void guardRuleHasTarget(BenefitPolicyRule rule) {
        if (rule == null) {
            throw new ArchitecturalViolationException("BenefitPolicyRule", "Rule cannot be null");
        }
        if (rule.getMedicalService() == null && rule.getMedicalCategory() == null) {
            throw ArchitecturalViolationException.ruleWithoutTarget(rule.getId());
        }
        log.trace("✅ Guard passed: Rule {} has target", rule.getId());
    }

    /**
     * Validate rule doesn't have both service and category (must be one or the other)
     */
    public void guardRuleHasSingleTarget(BenefitPolicyRule rule) {
        if (rule == null) {
            throw new ArchitecturalViolationException("BenefitPolicyRule", "Rule cannot be null");
        }
        if (rule.getMedicalService() != null && rule.getMedicalCategory() != null) {
            throw new ArchitecturalViolationException(
                "MULTIPLE_TARGETS",
                "BenefitPolicyRule",
                String.format("Rule %d cannot target both a Service and a Category. Choose one.", rule.getId())
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRICE SOURCE GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Warn if basePrice is being used for calculation.
     * RULE: Price must come from ProviderContract only
     */
    public void warnBasePriceUsage(String context) {
        log.warn("⚠️ ARCHITECTURAL WARNING: basePrice should not be used for calculation. " +
                "Use ProviderContract.contractPrice instead. Context: {}", context);
    }

    /**
     * Guard that price is from contract, not service
     */
    public void guardPriceFromContract(boolean hasContract, String context) {
        if (!hasContract) {
            throw ArchitecturalViolationException.invalidPriceSource(
                String.format("No contract found. %s", context)
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COVERAGE SOURCE GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Warn if coverage is being determined outside BenefitPolicy.
     * RULE: Coverage must come from BenefitPolicy only
     */
    public void warnCoverageSourceViolation(String context) {
        log.warn("⚠️ ARCHITECTURAL WARNING: Coverage should be determined by BenefitPolicyCoverageService only. " +
                "Context: {}", context);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPOSITE GUARDS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Run all guards for Claim creation
     */
    public void guardClaimCreation(Claim claim, List<ClaimLine> lines) {
        log.debug("🔒 Running architectural guards for Claim creation");
        guardClaimHasVisit(claim);
        guardClaimHasServices(claim, lines);
        log.debug("✅ All guards passed for Claim creation");
    }

    /**
     * Run all guards for PreAuthorization creation
     */
    public void guardPreAuthCreation(PreAuthorization preAuth) {
        log.debug("🔒 Running architectural guards for PreAuthorization creation");
        guardPreAuthHasVisit(preAuth);
        guardPreAuthHasService(preAuth);
        log.debug("✅ All guards passed for PreAuthorization creation");
    }

    /**
     * Run all guards for BenefitPolicyRule creation
     */
    public void guardRuleCreation(BenefitPolicyRule rule) {
        log.debug("🔒 Running architectural guards for BenefitPolicyRule creation");
        guardRuleHasTarget(rule);
        guardRuleHasSingleTarget(rule);
        log.debug("✅ All guards passed for BenefitPolicyRule creation");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ID-BASED COMPOSITE GUARDS (For DTO validation before entity creation)
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Run all guards for Claim creation using IDs (pre-entity validation).
     * @param visitId The visit ID from DTO
     * @param serviceIds List of medical service IDs from DTO lines
     */
    public void guardClaimCreation(Long visitId, List<Long> serviceIds) {
        log.debug("🔒 Running architectural guards for Claim creation (ID-based)");
        guardClaimHasVisit(visitId);
        guardClaimHasServices(serviceIds);
        log.debug("✅ All guards passed for Claim creation (ID-based)");
    }

    /**
     * Run all guards for PreAuthorization creation using IDs (pre-entity validation).
     * @param visitId The visit ID from DTO
     * @param medicalServiceId The medical service ID from DTO
     */
    public void guardPreAuthCreation(Long visitId, Long medicalServiceId) {
        log.debug("🔒 Running architectural guards for PreAuthorization creation (ID-based)");
        guardPreAuthHasVisit(visitId);
        guardPreAuthHasService(medicalServiceId);
        log.debug("✅ All guards passed for PreAuthorization creation (ID-based)");
    }

    /**
     * Run guards for BenefitPolicyRule creation using IDs (pre-entity validation).
     * @param serviceId Optional service ID
     * @param categoryId Optional category ID (at least one must be provided)
     */
    public void guardRuleCreation(Long serviceId, Long categoryId) {
        log.debug("🔒 Running architectural guards for Rule creation (ID-based)");
        if (serviceId == null && categoryId == null) {
            throw ArchitecturalViolationException.ruleWithoutTarget(null);
        }
        if (serviceId != null && categoryId != null) {
            throw new ArchitecturalViolationException(
                "MULTIPLE_TARGETS",
                "BenefitPolicyRule",
                "Rule cannot target both a Service and a Category. Choose one."
            );
        }
        log.debug("✅ All guards passed for Rule creation (ID-based)");
    }
}
