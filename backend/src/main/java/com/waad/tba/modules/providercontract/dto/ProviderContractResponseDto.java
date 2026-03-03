package com.waad.tba.modules.providercontract.dto;

import com.waad.tba.modules.providercontract.entity.ProviderContract;
import com.waad.tba.modules.providercontract.entity.ProviderContract.ContractStatus;
import com.waad.tba.modules.providercontract.entity.ProviderContract.PricingModel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO for returning Provider Contract data in API responses.
 * 
 * Includes:
 * - Full contract details
 * - Embedded provider summary
 * - Pricing items count
 * - Computed fields
 * 
 * @version 1.0
 * @since 2024-12-24
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SuppressWarnings("deprecation")
public class ProviderContractResponseDto {

    private Long id;
    private String contractCode;
    private String contractNumber;

    // Provider info (embedded)
    private ProviderSummaryDto provider;

    // Status and model
    private ContractStatus status;
    private String statusLabel;
    private PricingModel pricingModel;
    private String pricingModelLabel;

    // Financial
    private BigDecimal discountPercent;
    private BigDecimal totalValue;
    private String currency;
    private String paymentTerms;

    // Dates
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate signedDate;
    private Boolean autoRenew;

    // Contact
    private String contactPerson;
    private String contactPhone;
    private String contactEmail;

    // Metadata
    private String notes;
    private Integer pricingItemsCount;

    // Computed flags
    private Boolean isCurrentlyEffective;
    private Boolean hasExpired;
    private Boolean canActivate;
    private Boolean canSuspend;
    private Boolean canTerminate;
    private Boolean canModifyPricing;

    // Audit
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;

    /**
     * Convert entity to response DTO
     */
    public static ProviderContractResponseDto fromEntity(ProviderContract entity) {
        if (entity == null) {
            return null;
        }

        ProviderSummaryDto providerDto = null;
        if (entity.getProvider() != null) {
            providerDto = ProviderSummaryDto.builder()
                    .id(entity.getProvider().getId())
                    .name(entity.getProvider().getName())
                    .code(entity.getProvider().getLicenseNumber())
                    .providerType(entity.getProvider().getProviderType() != null 
                            ? entity.getProvider().getProviderType().name() : null)
                    .city(entity.getProvider().getCity())
                    .build();
        }

        return ProviderContractResponseDto.builder()
                .id(entity.getId())
                .contractCode(entity.getContractCode())
                .contractNumber(entity.getContractNumber())
                .provider(providerDto)
                .status(entity.getStatus())
                .statusLabel(getStatusLabel(entity.getStatus()))
                .pricingModel(entity.getPricingModel())
                .pricingModelLabel(getPricingModelLabel(entity.getPricingModel()))
                .discountPercent(entity.getDiscountPercent())
                .totalValue(entity.getTotalValue())
                .currency(entity.getCurrency())
                .paymentTerms(entity.getPaymentTerms())
                .startDate(entity.getStartDate())
                .endDate(entity.getEndDate())
                .signedDate(entity.getSignedDate())
                .autoRenew(entity.getAutoRenew())
                .contactPerson(entity.getContactPerson())
                .contactPhone(entity.getContactPhone())
                .contactEmail(entity.getContactEmail())
                .notes(entity.getNotes())
                .pricingItemsCount(entity.getActivePricingItemsCount())
                .isCurrentlyEffective(entity.isCurrentlyEffective())
                .hasExpired(entity.hasExpired())
                .canActivate(entity.canActivate())
                .canSuspend(entity.canSuspend())
                .canTerminate(entity.canTerminate())
                .canModifyPricing(entity.canModifyPricing())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .createdBy(entity.getCreatedBy())
                .build();
    }

    /**
     * Get Arabic label for status
     */
    private static String getStatusLabel(ContractStatus status) {
        if (status == null) return null;
        return switch (status) {
            case DRAFT -> "مسودة";
            case ACTIVE -> "نشط";
            case SUSPENDED -> "موقوف";
            case EXPIRED -> "منتهي";
            case TERMINATED -> "ملغي";
        };
    }

    /**
     * Get Arabic label for pricing model
     */
    private static String getPricingModelLabel(PricingModel model) {
        if (model == null) return null;
        return switch (model) {
            case FIXED -> "سعر ثابت";
            case DISCOUNT -> "نسبة خصم";
            case TIERED -> "تسعير متدرج";
            case NEGOTIATED -> "سعر تفاوضي";
        };
    }

    /**
     * Embedded Provider Summary DTO
     * Single source of truth: name comes from Provider.getName()
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProviderSummaryDto {
        private Long id;
        private String code;
        private String name; // Single name field - no duplication
        private String providerType;
        private String city;
    }
}

