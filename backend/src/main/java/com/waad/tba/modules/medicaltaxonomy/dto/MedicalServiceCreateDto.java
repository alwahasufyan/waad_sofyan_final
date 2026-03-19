package com.waad.tba.modules.medicaltaxonomy.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalServiceCreateDto {

    @NotBlank(message = "Service code is required")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "Service name is required")
    @Size(max = 200)
    private String name;

    @NotNull(message = "Category ID is required")
    private Long categoryId;

    @DecimalMin(value = "0.00", message = "Base price must be >= 0")
    private BigDecimal basePrice;

    @Builder.Default
    private Boolean active = true;
}