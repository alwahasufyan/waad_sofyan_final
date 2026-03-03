package com.waad.tba.modules.medicaltaxonomy.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/** Request body for POST /api/v1/medical-specialties */
@Data
public class MedicalSpecialtyCreateDto {

    @NotBlank(message = "Specialty code is required")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "Arabic name is required")
    @Size(max = 255)
    private String nameAr;

    @Size(max = 255)
    private String nameEn;

    @NotNull(message = "Category ID is required")
    private Long categoryId;
}
