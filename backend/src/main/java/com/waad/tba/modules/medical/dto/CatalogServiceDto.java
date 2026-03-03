package com.waad.tba.modules.medical.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Projection DTO for a single medical service within a catalog tree node.
 * Read-only — never backed by an entity reference.
 */
@Value
@Builder
public class CatalogServiceDto {

    Long id;
    String code;
    /** Arabic name stored in medical_services.name_ar */
    String nameAr;
    /** English name stored in medical_services.name_en */
    String nameEn;
    boolean isMaster;
    boolean active;
    /** Specialty association — null if not yet classified (V87+) */
    Long   specialtyId;
    String specialtyCode;
    String specialtyNameAr;
}
