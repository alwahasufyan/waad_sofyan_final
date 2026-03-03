package com.waad.tba.modules.employer.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Employer Create DTO - Unified Version
 * 
 * Field Normalization:
 * - Accepts both 'code' and 'employerCode' (via @JsonAlias)
 * - Uses unified 'name' field
 * - 'code' is OPTIONAL - auto-generated if not provided (EMP-01, EMP-02, ...)
 * 
 * @see EMPLOYER_API_CONTRACT.md
 */
@Data
public class EmployerCreateDto {

    /**
     * Employer code - OPTIONAL (auto-generated if not provided)
     * Format: EMP-XX (zero-padded, numeric sequence for up to 15 employers)
     * Accepts: 'code' or 'employerCode' (frontend compatibility)
     */
    @JsonAlias({"employerCode"})
    @Size(max = 50, message = "Employer code too long")
    private String code;

    /**
     * Employer name - REQUIRED
     */
    @NotBlank(message = "Employer name is required")
    @Size(max = 200, message = "Employer name too long")
    private String name;

    /**
     * Active status - OPTIONAL (defaults to true)
     */
    private Boolean active;
}
