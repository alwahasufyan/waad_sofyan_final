package com.waad.tba.modules.providercontract.entity;

import com.waad.tba.modules.provider.entity.Provider;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Provider Contract Entity - represents a pricing agreement with a healthcare provider.
 * 
 * Business Rules:
 * - Only ONE active contract per provider at any time
 * - Cannot activate an expired contract
 * - Pricing items are read-only if contract is EXPIRED or TERMINATED
 * - Contract dates cannot overlap for same provider
 * 
 * Maps to: provider_contracts table (enhanced from V16)
 * 
 * @version 2.0
 * @since 2024-12-24
 */
@Entity(name = "ModernProviderContract")
@Table(name = "provider_contracts", indexes = {
    @Index(name = "idx_contracts_provider_id", columnList = "provider_id"),
    @Index(name = "idx_contracts_status", columnList = "status"),
    @Index(name = "idx_contracts_contract_code", columnList = "contract_code"),
    @Index(name = "idx_contracts_start_date", columnList = "start_date"),
    @Index(name = "idx_contracts_end_date", columnList = "end_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderContract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique business code (e.g., CON-2024-001)
     */
    @NotBlank(message = "Contract code is required")
    @Size(max = 50, message = "Contract code must not exceed 50 characters")
    @Column(name = "contract_code", nullable = false, unique = true, length = 50)
    private String contractCode;

    /**
     * Legacy field - contract number (kept for backward compatibility)
     */
    @Column(name = "contract_number", length = 100)
    private String contractNumber;

    /**
     * The healthcare provider this contract is with
     */
    @NotNull(message = "Provider is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider;

    /**
     * Contract status
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ContractStatus status = ContractStatus.DRAFT;

    /**
     * Pricing model type
     */
    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_model", nullable = false, length = 20)
    @Builder.Default
    private PricingModel pricingModel = PricingModel.DISCOUNT;

    /**
     * Default discount percentage for this contract
     */
    @DecimalMin(value = "0.00", message = "Discount must be >= 0")
    @DecimalMax(value = "100.00", message = "Discount must be <= 100")
    @Column(name = "discount_percent", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal discountPercent = BigDecimal.ZERO;

    /**
     * [DEPRECATED] Legacy field - discount rate
     * 
     * @deprecated Use ProviderContractPricingItem.discountPercent instead.
     * This field is kept for backward compatibility but should not be used
     * for new implementations.
     */
    @Deprecated(since = "2026-01-22", forRemoval = false)
    @Column(name = "discount_rate", precision = 5, scale = 2)
    private BigDecimal discountRate;

    /**
     * Contract effective start date
     */
    @NotNull(message = "Start date is required")
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    /**
     * Contract effective end date
     */
    @Column(name = "end_date")
    private LocalDate endDate;

    /**
     * Date contract was signed
     */
    @Column(name = "signed_date")
    private LocalDate signedDate;

    /**
     * [DEPRECATED] Total estimated contract value
     * 
     * @deprecated This field is not used in any calculations.
     * Contract value should be calculated from sum of pricing items if needed.
     */
    @Deprecated(since = "2026-01-22", forRemoval = false)
    @DecimalMin(value = "0.00", message = "Total value must be >= 0")
    @Column(name = "total_value", precision = 15, scale = 2)
    private BigDecimal totalValue;

    /**
     * Currency code
     */
    @Size(max = 3)
    @Column(length = 3)
    @Builder.Default
    private String currency = "LYD";

    /**
     * Payment terms (e.g., "Net 30")
     */
    @Size(max = 100)
    @Column(name = "payment_terms", length = 100)
    private String paymentTerms;

    /**
     * Auto renewal flag
     */
    @Column(name = "auto_renew", nullable = false)
    @Builder.Default
    private Boolean autoRenew = false;

    /**
     * Contact person at provider
     */
    @Size(max = 100)
    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    /**
     * Contact phone
     */
    @Size(max = 50)
    @Column(name = "contact_phone", length = 50)
    private String contactPhone;

    /**
     * Contact email
     */
    @Size(max = 100)
    @Email(message = "Invalid email format")
    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    /**
     * Additional notes
     */
    @Size(max = 2000)
    @Column(length = 2000)
    private String notes;

    /**
     * Soft delete flag
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    /**
     * Pricing items for this contract
     * 
     * CASCADE POLICY: Financial data must use PERSIST/MERGE only (never REMOVE/ALL)
     * - Prevents accidental deletion of pricing audit trail
     * - Complies with FK cascade policy for financial/historical data
     * - orphanRemoval = false to preserve pricing history
     */
    @OneToMany(mappedBy = "contract", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = false)
    @Builder.Default
    private List<ProviderContractPricingItem> pricingItems = new ArrayList<>();

    // ═══════════════════════════════════════════════════════════════════════════
    // AUDIT FIELDS
    // ═══════════════════════════════════════════════════════════════════════════

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Size(max = 100)
    @Column(name = "created_by", length = 100)
    private String createdBy;

    @Size(max = 100)
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Contract status enum
     */
    public enum ContractStatus {
        DRAFT,      // مسودة - Contract is being prepared
        ACTIVE,     // نشط - Contract is currently active
        SUSPENDED,  // موقوف - Contract temporarily suspended
        EXPIRED,    // منتهي - Contract has expired
        TERMINATED  // ملغي - Contract was terminated early
    }

    /**
     * Pricing model enum
     */
    public enum PricingModel {
        FIXED,      // سعر ثابت - Fixed price per service
        DISCOUNT,   // نسبة خصم - Percentage discount from list price
        TIERED,     // تسعير متدرج - Volume-based pricing tiers
        NEGOTIATED  // سعر تفاوضي - Individually negotiated prices
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if contract is currently effective (based on dates)
     */
    public boolean isCurrentlyEffective() {
        LocalDate today = LocalDate.now();
        return startDate != null && !startDate.isAfter(today) &&
               (endDate == null || !endDate.isBefore(today));
    }

    /**
     * Check if contract has expired
     */
    public boolean hasExpired() {
        return endDate != null && endDate.isBefore(LocalDate.now());
    }

    /**
     * Check if contract can be activated
     */
    public boolean canActivate() {
        return status == ContractStatus.DRAFT || status == ContractStatus.SUSPENDED;
    }

    /**
     * Check if contract can be suspended
     */
    public boolean canSuspend() {
        return status == ContractStatus.ACTIVE;
    }

    /**
     * Check if contract can be terminated
     */
    public boolean canTerminate() {
        return status == ContractStatus.ACTIVE || status == ContractStatus.SUSPENDED;
    }

    /**
     * Check if pricing items can be modified
     */
    public boolean canModifyPricing() {
        return status == ContractStatus.DRAFT || status == ContractStatus.ACTIVE || status == ContractStatus.SUSPENDED;
    }

    /**
     * Add a pricing item to this contract
     */
    public void addPricingItem(ProviderContractPricingItem item) {
        pricingItems.add(item);
        item.setContract(this);
    }

    /**
     * Remove a pricing item from this contract
     */
    public void removePricingItem(ProviderContractPricingItem item) {
        pricingItems.remove(item);
        item.setContract(null);
    }

    /**
     * Get count of active pricing items
     */
    public int getActivePricingItemsCount() {
        return (int) pricingItems.stream()
                .filter(item -> Boolean.TRUE.equals(item.getActive()))
                .count();
    }
}
