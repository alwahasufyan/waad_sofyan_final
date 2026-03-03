package com.waad.tba.modules.medicaltaxonomy.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/** Request body for PUT /api/v1/medical-specialties/{id} */
@Data
public class MedicalSpecialtyUpdateDto {

    @Size(max = 255)
    private String nameAr;

    @Size(max = 255)
    private String nameEn;

    /** Reassign specialty to a different category. */
    private Long categoryId;
}
