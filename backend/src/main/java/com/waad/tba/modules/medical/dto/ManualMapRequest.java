package com.waad.tba.modules.medical.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request body for the manual-map endpoint.
 *
 * <pre>
 * POST /api/v1/provider-mapping/manual-map
 * {
 *   "rawId": 1,
 *   "medicalServiceId": 55
 * }
 * </pre>
 */
@Data
public class ManualMapRequest {

    @NotNull
    private Long rawId;

    @NotNull
    private Long medicalServiceId;
}
