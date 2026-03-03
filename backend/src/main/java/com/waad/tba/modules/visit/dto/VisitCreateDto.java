package com.waad.tba.modules.visit.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.waad.tba.modules.visit.entity.VisitType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VisitCreateDto {
    
    @NotNull(message = "Member ID is required")
    private Long memberId;
    
    /**
     * Provider ID - REQUIRED for all visits.
     * - For PROVIDER users: auto-filled from session (no need to send)
     * - For ADMIN users: must be explicitly provided
     * 
     * NOTE: @NotNull removed because PROVIDER users get it auto-filled from session.
     * Service layer validates that ADMIN users provide it.
     */
    private Long providerId;
    
    @NotNull(message = "Visit date is required")
    private LocalDate visitDate;
    
    @NotBlank(message = "Doctor name is required")
    private String doctorName;
    
    private String specialty;
    
    private String diagnosis;
    
    private String treatment;
    
    private BigDecimal totalAmount;
    
    private String notes;
    
    /**
     * Type of visit/service location
     * Optional - defaults to OUTPATIENT if not provided
     */
    private VisitType visitType;
}
