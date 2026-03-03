package com.waad.tba.modules.provider.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderUpdateDto {
    /**
     * Provider name (unified field)
     */
    private String name;
    
    private String licenseNumber;
    private String taxNumber;
    private String city;
    private String address;
    private String phone;
    private String email;
    private String providerType;
    private String networkStatus;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    
    /**
     * PHASE 3 REVIEW: defaultDiscountRate removed from DTO.
     * Use ProviderContract.discountPercent instead for all new contracts.
     * Field kept in entity for backward compatibility with existing data only.
     */
    // private BigDecimal defaultDiscountRate; // DEPRECATED - DO NOT USE
    
    private Boolean active;
    
    /**
     * If true, provider services are available to ALL employers
     * If false, restricted to allowedEmployers list
     */
    private Boolean allowAllEmployers;
}
