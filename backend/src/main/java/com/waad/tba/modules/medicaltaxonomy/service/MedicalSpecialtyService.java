package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalSpecialtyCreateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalSpecialtyDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalSpecialtyUpdateDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalSpecialty;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalSpecialtyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Full CRUD service for Medical Specialties (hardened in V90).
 *
 * <p>Validation rules:
 * <ul>
 *   <li>Cannot create specialty without a valid category.</li>
 *   <li>Cannot delete category if specialties exist under it (enforced elsewhere).</li>
 *   <li>Cannot delete specialty if active services exist under it.</li>
 *   <li>Soft-delete only — no hard DELETE allowed.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalSpecialtyService {

    private final MedicalSpecialtyRepository repository;
    private final MedicalCategoryRepository  categoryRepository;

    // ── LIST ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MedicalSpecialtyDto> listActive() {
        return repository.findAllByDeletedFalseOrderByNameAr()
                .stream().map(s -> toDto(s, null)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MedicalSpecialtyDto> listByCategory(Long categoryId) {
        MedicalCategory cat = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new BusinessRuleException("Category not found: " + categoryId));
        return repository.findAllByCategoryIdAndDeletedFalseOrderByNameAr(categoryId)
                .stream().map(s -> toDto(s, cat)).collect(Collectors.toList());
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    @Transactional
    public MedicalSpecialtyDto create(MedicalSpecialtyCreateDto dto) {
        if (repository.existsByCode(dto.getCode())) {
            throw new BusinessRuleException("Specialty code already exists: " + dto.getCode());
        }
        MedicalCategory category = categoryRepository.findById(dto.getCategoryId())
                .orElseThrow(() -> new BusinessRuleException(
                        "Category not found or inactive: " + dto.getCategoryId()));
        if (category.isDeleted()) {
            throw new BusinessRuleException("Cannot create specialty under deleted category: " + dto.getCategoryId());
        }

        MedicalSpecialty sp = MedicalSpecialty.builder()
                .code(dto.getCode())
                .nameAr(dto.getNameAr())
                .nameEn(dto.getNameEn())
                .categoryId(dto.getCategoryId())
                .deleted(false)
                .build();
        sp = repository.save(sp);
        log.info("Created specialty {} (ID {})", sp.getCode(), sp.getId());
        return toDto(sp, category);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    @Transactional
    public MedicalSpecialtyDto update(Long id, MedicalSpecialtyUpdateDto dto) {
        MedicalSpecialty sp = findOrThrow(id);

        if (dto.getNameAr()    != null) sp.setNameAr(dto.getNameAr());
        if (dto.getNameEn()    != null) sp.setNameEn(dto.getNameEn());
        if (dto.getCategoryId() != null) {
            MedicalCategory cat = categoryRepository.findById(dto.getCategoryId())
                    .orElseThrow(() -> new BusinessRuleException(
                            "Category not found: " + dto.getCategoryId()));
            if (cat.isDeleted()) throw new BusinessRuleException(
                    "Cannot reassign to deleted category: " + dto.getCategoryId());
            sp.setCategoryId(dto.getCategoryId());
        }
        sp = repository.save(sp);
        log.info("Updated specialty {} (ID {})", sp.getCode(), sp.getId());
        MedicalCategory cat = sp.getCategoryId() != null
                ? categoryRepository.findById(sp.getCategoryId()).orElse(null)
                : null;
        return toDto(sp, cat);
    }

    // ── TOGGLE ────────────────────────────────────────────────────────────────

    @Transactional
    public MedicalSpecialtyDto toggle(Long id) {
        MedicalSpecialty sp = findOrThrow(id);

        // Guard: cannot soft-delete if active services exist
        if (!sp.getDeleted()) {
            long svcCount = repository.countActiveServicesBySpecialty(id);
            if (svcCount > 0) {
                throw new BusinessRuleException(
                        "Cannot deactivate specialty — " + svcCount + " active service(s) still referencing it.");
            }
        }

        sp.setDeleted(!sp.getDeleted());
        sp = repository.save(sp);
        log.info("Toggled specialty {} — deleted={}", sp.getCode(), sp.getDeleted());
        return toDto(sp, null);
    }

    // ── INTERNAL ──────────────────────────────────────────────────────────────

    public MedicalSpecialty findOrThrow(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new BusinessRuleException("Specialty not found: " + id));
    }

    public MedicalSpecialty findByCodeOrThrow(String code) {
        return repository.findByCode(code)
                .orElseThrow(() -> new BusinessRuleException("Specialty not found: " + code));
    }

    MedicalSpecialtyDto toDto(MedicalSpecialty s, MedicalCategory cat) {
        return MedicalSpecialtyDto.builder()
                .id(s.getId())
                .code(s.getCode())
                .nameAr(s.getNameAr())
                .nameEn(s.getNameEn())
                .categoryId(s.getCategoryId())
                .categoryNameAr(cat != null ? cat.getNameAr() : null)
                .deleted(s.getDeleted())
                .build();
    }
}
