package com.waad.tba.modules.medical.dto;

import com.waad.tba.modules.medical.enums.MappingStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Read-only response DTO for a {@code provider_raw_services} row,
 * optionally enriched with its resolved mapping.
 */
@Data
@Builder
public class RawServiceDto {

    private Long id;
    private Long providerId;
    private String rawName;
    private String normalizedName;
    private String code;
    private String encounterType;
    private String source;
    private MappingStatus status;
    private BigDecimal confidenceScore;
    private LocalDateTime createdAt;

    /** Present when status = AUTO_MATCHED or MANUAL_CONFIRMED */
    private MappingDto mapping;

    @Data
    @Builder
    public static class MappingDto {
        private Long mappingId;
        private Long medicalServiceId;
        private String medicalServiceCode;
        private String medicalServiceName;
        private MappingStatus mappingStatus;
        private BigDecimal confidenceScore;
        private LocalDateTime mappedAt;
    }
}
