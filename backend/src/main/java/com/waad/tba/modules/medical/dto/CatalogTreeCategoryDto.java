package com.waad.tba.modules.medical.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

/**
 * Projection DTO for a single category node in the medical catalog tree.
 * Contains a flat list of associated services (pivot done in service layer).
 */
@Data
@Builder
public class CatalogTreeCategoryDto {

    Long categoryId;
    String code;
    String nameAr;
    String nameEn;
    List<CatalogServiceDto> services;
}
