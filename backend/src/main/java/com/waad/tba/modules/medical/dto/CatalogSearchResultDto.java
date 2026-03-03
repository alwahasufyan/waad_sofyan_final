package com.waad.tba.modules.medical.dto;

import lombok.Builder;
import lombok.Value;

/**
 * Flat search result DTO for /api/v1/medical-catalog/search.
 * Includes the first-found category association for context display.
 */
@Value
@Builder
public class CatalogSearchResultDto {

    Long id;
    String code;
    String nameAr;
    String nameEn;
    boolean isMaster;
    boolean active;
    /** Category context — may be null if service has no category assignment */
    Long   categoryId;
    String categoryCode;
    String categoryNameAr;
    /** Specialty association — null if not yet classified (V87+) */
    Long   specialtyId;
    String specialtyCode;
    String specialtyNameAr;
}
