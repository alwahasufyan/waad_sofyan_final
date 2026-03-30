package com.waad.tba.modules.settlement.api.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Update a monthly payment document via accounting-safe reversal and repost")
public class UpdateMonthlyPaymentDocumentRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Payment date is required")
    private LocalDate paymentDate;

    @Size(max = 100, message = "Payment reference must not exceed 100 characters")
    private String paymentReference;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    private String notes;
}
