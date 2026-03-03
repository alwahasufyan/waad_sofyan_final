package com.waad.tba.modules.preauthorization.dto;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * DTO for approving a PreAuthorization
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PreAuthorizationApproveDto {

    @NotNull(message = "Approved amount is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Approved amount must be greater than 0")
    @Digits(integer = 10, fraction = 2, message = "Approved amount must have at most 10 integer digits and 2 decimal places")
    private BigDecimal approvedAmount;

    @DecimalMin(value = "0.0", message = "Copay percentage must be 0 or greater")
    @DecimalMax(value = "100.0", message = "Copay percentage must not exceed 100")
    @Digits(integer = 3, fraction = 2, message = "Copay percentage must have at most 3 integer digits and 2 decimal places")
    private BigDecimal copayPercentage;

    @Size(max = 1000, message = "Approval notes must not exceed 1000 characters")
    private String approvalNotes;
}
