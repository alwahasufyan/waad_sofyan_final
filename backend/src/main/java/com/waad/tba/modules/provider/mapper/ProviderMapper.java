package com.waad.tba.modules.provider.mapper;

import org.springframework.stereotype.Component;

import com.waad.tba.modules.provider.dto.ProviderCreateDto;
import com.waad.tba.modules.provider.dto.ProviderSelectorDto;
import com.waad.tba.modules.provider.dto.ProviderUpdateDto;
import com.waad.tba.modules.provider.dto.ProviderViewDto;
import com.waad.tba.modules.provider.entity.Provider;

@Component
public class ProviderMapper {

    /**
     * Maps ProviderCreateDto to Provider entity.
     * Uses unified 'name' field.
     * 
     * PHASE 3 REVIEW: defaultDiscountRate removed from mapping.
     * Field will be null for new providers (use ProviderContract instead).
     */
    public Provider toEntity(ProviderCreateDto dto) {
        return Provider.builder()
                .name(dto.getName())
                .licenseNumber(dto.getLicenseNumber())
                .taxNumber(dto.getTaxNumber())
                .city(dto.getCity())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .providerType(dto.getProviderType() != null ? 
                        Provider.ProviderType.valueOf(dto.getProviderType()) : null)
                .networkStatus(dto.getNetworkStatus() != null ? 
                        Provider.NetworkTier.valueOf(dto.getNetworkStatus()) : null)
                .contractStartDate(dto.getContractStartDate())
                .contractEndDate(dto.getContractEndDate())
                // .defaultDiscountRate(dto.getDefaultDiscountRate()) // REMOVED - Use ProviderContract.discountPercent
                .allowAllEmployers(dto.getAllowAllEmployers() != null ? dto.getAllowAllEmployers() : false)
                .active(true)
                .build();
    }

    /**
     * Updates Provider entity from ProviderUpdateDto.
     * Uses unified 'name' field.
     * 
     * PHASE 3 REVIEW: defaultDiscountRate removed from mapping.
     * Existing value preserved, new updates go to ProviderContract.
     */
    public void updateEntityFromDto(Provider provider, ProviderUpdateDto dto) {
        if (dto.getName() != null) {
            provider.setName(dto.getName());
        }
        if (dto.getLicenseNumber() != null) {
            provider.setLicenseNumber(dto.getLicenseNumber());
        }
        if (dto.getTaxNumber() != null) {
            provider.setTaxNumber(dto.getTaxNumber());
        }
        if (dto.getCity() != null) {
            provider.setCity(dto.getCity());
        }
        if (dto.getAddress() != null) {
            provider.setAddress(dto.getAddress());
        }
        if (dto.getPhone() != null) {
            provider.setPhone(dto.getPhone());
        }
        if (dto.getEmail() != null) {
            provider.setEmail(dto.getEmail());
        }
        if (dto.getProviderType() != null) {
            provider.setProviderType(Provider.ProviderType.valueOf(dto.getProviderType()));
        }
        if (dto.getNetworkStatus() != null) {
            provider.setNetworkStatus(Provider.NetworkTier.valueOf(dto.getNetworkStatus()));
        }
        if (dto.getContractStartDate() != null) {
            provider.setContractStartDate(dto.getContractStartDate());
        }
        if (dto.getContractEndDate() != null) {
            provider.setContractEndDate(dto.getContractEndDate());
        }
        // defaultDiscountRate REMOVED - Use ProviderContract.discountPercent for new/updated rates
        if (dto.getActive() != null) {
            provider.setActive(dto.getActive());
        }
        if (dto.getAllowAllEmployers() != null) {
            provider.setAllowAllEmployers(dto.getAllowAllEmployers());
        }
    }

    /**
     * Maps Provider entity to ProviderViewDto.
     * Uses unified 'name' field.
     * 
     * PHASE 3 REVIEW: defaultDiscountRate excluded from view to prevent usage.
     * Field still exists in DB for backward compatibility with historical data.
     */
    public ProviderViewDto toViewDto(Provider provider) {
        String typeLabel = provider.getProviderType() != null ? 
                getProviderTypeLabel(provider.getProviderType()) : null;
        String networkStatusLabel = provider.getNetworkStatus() != null ? 
                getNetworkStatusLabel(provider.getNetworkStatus()) : null;
        
        return ProviderViewDto.builder()
                .id(provider.getId())
                .name(provider.getName())
                .licenseNumber(provider.getLicenseNumber())
                .taxNumber(provider.getTaxNumber())
                .city(provider.getCity())
                .address(provider.getAddress())
                .phone(provider.getPhone())
                .email(provider.getEmail())
                .providerType(provider.getProviderType() != null ? 
                        provider.getProviderType().name() : null)
                .providerTypeLabel(typeLabel)
                .networkStatus(provider.getNetworkStatus() != null ? 
                        provider.getNetworkStatus().name() : null)
                .networkStatusLabel(networkStatusLabel)
                .active(provider.getActive())
                .hasDocuments(provider.getHasDocuments() != null ? provider.getHasDocuments() : false)
                .contractStartDate(provider.getContractStartDate())
                .contractEndDate(provider.getContractEndDate())
                // .defaultDiscountRate(provider.getDefaultDiscountRate()) // REMOVED - Not for client consumption
                .createdAt(provider.getCreatedAt())
                .updatedAt(provider.getUpdatedAt())
                .build();
    }

    /**
     * Maps Provider entity to ProviderSelectorDto for dropdown lists.
     * Uses unified 'name' field.
     */
    public ProviderSelectorDto toSelectorDto(Provider provider) {
        if (provider == null) return null;
        
        return ProviderSelectorDto.builder()
                .id(provider.getId())
                .code(provider.getLicenseNumber())
                .name(provider.getName())
                .providerType(provider.getProviderType() != null 
                        ? getProviderTypeLabel(provider.getProviderType()) 
                        : null)
                .build();
    }

    private String getProviderTypeLabel(Provider.ProviderType type) {
        return switch (type) {
            case HOSPITAL -> "مستشفى";
            case CLINIC -> "عيادة";
            case LAB -> "مختبر";
            case PHARMACY -> "صيدلية";
            case RADIOLOGY -> "أشعة";
        };
    }

    private String getNetworkStatusLabel(Provider.NetworkTier tier) {
        return switch (tier) {
            case IN_NETWORK -> "داخل الشبكة";
            case OUT_OF_NETWORK -> "خارج الشبكة";
            case PREFERRED -> "مزود مفضل";
        };
    }
}
