package com.waad.tba.modules.medicaltaxonomy.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO for updating a Medical Service.
 * 
 * Note: 'code' is immutable and cannot be changed.
 * All fields are optional (partial update).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceUpdateDto {

    /**
     * Service name (unified field)
     */
    @Size(max = 200, message = "Service name must not exceed 200 characters")
    private String name;

    /**
     * Category ID
     */
    private Long categoryId;

    /**
     * Service description (optional)
     */
    @Size(max = 500, message = "Description must not exceed 500 characters")
    private String description;

    /**
     * Base price (reference only)
     */
    @DecimalMin(value = "0.00", message = "Base price must be >= 0")
    private BigDecimal basePrice;

    /**
     * Flag indicating if pre-authorization is required
     */
    @JsonAlias({"requiresPreApproval", "requiresPA"})
    private Boolean requiresPA;

    /**
     * Active status
     */
    private Boolean active;
}
