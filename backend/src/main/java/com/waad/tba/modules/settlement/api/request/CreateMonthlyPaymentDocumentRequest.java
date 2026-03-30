package com.waad.tba.modules.settlement.api.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Create a monthly provider payment/receipt voucher")
public class CreateMonthlyPaymentDocumentRequest {

    @NotNull(message = "Year is required")
    @Schema(description = "Calendar year", example = "2026")
    private Integer year;

    @NotNull(message = "Month is required")
    @Min(value = 1, message = "Month must be between 1 and 12")
    @Max(value = 12, message = "Month must be between 1 and 12")
    @Schema(description = "Calendar month 1..12", example = "3")
    private Integer month;

    @NotNull(message = "Document type is required")
    @Schema(description = "PAYMENT_VOUCHER for disbursement, RECEIPT_VOUCHER for collection")
    private String documentType;

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
