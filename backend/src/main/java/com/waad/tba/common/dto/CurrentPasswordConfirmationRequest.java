package com.waad.tba.common.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CurrentPasswordConfirmationRequest {

    @NotBlank(message = "كلمة المرور الحالية مطلوبة")
    private String currentPassword;
}