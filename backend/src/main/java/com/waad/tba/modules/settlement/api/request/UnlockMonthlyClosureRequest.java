package com.waad.tba.modules.settlement.api.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Unlock a monthly closure with mandatory reason")
public class UnlockMonthlyClosureRequest {

    @NotBlank(message = "Unlock reason is required")
    @Size(max = 500, message = "Unlock reason must not exceed 500 characters")
    private String reason;
}
