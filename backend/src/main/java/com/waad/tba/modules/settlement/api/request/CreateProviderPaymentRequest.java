package com.waad.tba.modules.settlement.api.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Record provider payment for a confirmed settlement batch")
public class CreateProviderPaymentRequest {

    @NotNull(message = "amount is required")
    @DecimalMin(value = "0.01", message = "amount must be positive")
    private BigDecimal amount;

    @NotBlank(message = "paymentReference is required")
    @Size(max = 100, message = "paymentReference max length is 100")
    private String paymentReference;

    @Size(max = 50, message = "paymentMethod max length is 50")
    private String paymentMethod;

    private LocalDateTime paymentDate;

    @Size(max = 1000, message = "notes max length is 1000")
    private String notes;
}
