package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceCreateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.enums.MedicalServiceStatus;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalServiceService {

    private final MedicalServiceRepository medicalServiceRepository;
    private final MedicalCategoryRepository medicalCategoryRepository;

    @Transactional
    public MedicalServiceResponseDto create(MedicalServiceCreateDto dto) {
        String normalizedCode = dto.getCode().trim();
        String normalizedName = dto.getName().trim();

        if (medicalServiceRepository.existsByCodeIgnoreCase(normalizedCode)) {
            throw new BusinessRuleException("Medical service code already exists: " + normalizedCode);
        }

        MedicalCategory category = medicalCategoryRepository.findActiveById(dto.getCategoryId())
                .orElseThrow(() -> new BusinessRuleException("Medical category not found: " + dto.getCategoryId()));

        MedicalService service = MedicalService.builder()
                .code(normalizedCode)
                .name(normalizedName)
                .nameAr(normalizedName)
                .nameEn(normalizedName)
                .categoryId(category.getId())
                .basePrice(dto.getBasePrice() != null ? dto.getBasePrice() : BigDecimal.ZERO)
                .cost(dto.getBasePrice() != null ? dto.getBasePrice() : BigDecimal.ZERO)
                .status(Boolean.FALSE.equals(dto.getActive()) ? MedicalServiceStatus.DRAFT : MedicalServiceStatus.ACTIVE)
                .active(!Boolean.FALSE.equals(dto.getActive()))
                .requiresPA(false)
                .isMaster(false)
                .deleted(false)
                .build();

        MedicalService saved = medicalServiceRepository.save(service);
        log.info("[MEDICAL-SERVICES] Created service code={} categoryId={}", saved.getCode(), saved.getCategoryId());

        return MedicalServiceResponseDto.builder()
                .id(saved.getId())
                .code(saved.getCode())
                .name(saved.getName())
                .categoryId(category.getId())
                .categoryName(category.getName())
                .categoryCode(category.getCode())
                .description(saved.getDescription())
                .basePrice(saved.getBasePrice())
                .requiresPA(saved.isRequiresPA())
                .requiresPreApproval(saved.isRequiresPA())
                .active(saved.isActive())
                .createdAt(saved.getCreatedAt())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }
}