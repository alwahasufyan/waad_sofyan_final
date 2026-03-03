package com.waad.tba.modules.settlement.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Request DTO for creating a settlement batch.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBatchRequest {

    @NotNull(message = "Provider ID is required")
    private Long providerId;
    
    /**
     * Optional description for the batch
     */
    private String description;
    
    /**
     * Optional list of claim IDs to add to the batch immediately
     */
    private List<Long> claimIds;
    
    /**
     * User creating the batch (from JWT)
     */
    private Long createdBy;
}
