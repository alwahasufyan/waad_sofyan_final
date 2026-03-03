package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Read-only projection of {@link com.waad.tba.modules.medicaltaxonomy.entity.MedicalSpecialty}
 * returned to API consumers.
 */
@Value
@Builder
public class MedicalSpecialtyDto {
    Long   id;
    String code;
    String nameAr;
    String nameEn;

    /** FK to medical_categories (populated after V90) */
    Long   categoryId;

    /** Category Arabic name — convenience field for UI dropdowns */
    String categoryNameAr;

    /** Soft-delete state */
    Boolean deleted;
}
