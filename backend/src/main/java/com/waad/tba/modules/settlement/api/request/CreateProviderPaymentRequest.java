package com.waad.tba.modules.settlement.api.request;

import java.math.BigDecimal;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Request to record a provider payment or installment")
public class CreateProviderPaymentRequest {

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "0.01", message = "Payment amount must be greater than 0")
    @Schema(description = "Payment amount to debit from provider balance", example = "1500.00")
    private BigDecimal amount;

    @NotBlank(message = "Payment reference is required")
    @Size(max = 100, message = "Payment reference must not exceed 100 characters")
    @Schema(description = "Finance or bank transfer reference", example = "TRX-2026-00045")
    private String paymentReference;

    @Size(max = 50, message = "Payment method must not exceed 50 characters")
    @Schema(description = "Payment method label from the frontend", example = "BANK_TRANSFER")
    private String paymentMethod;

    @Size(max = 500, message = "Notes must not exceed 500 characters")
    @Schema(description = "Optional notes for the payment", example = "دفعة جزئية لشهر مارس")
    private String notes;
}