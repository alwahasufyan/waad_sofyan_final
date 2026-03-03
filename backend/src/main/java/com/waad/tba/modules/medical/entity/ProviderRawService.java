package com.waad.tba.modules.medical.entity;

import com.waad.tba.modules.medical.enums.MappingStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Raw service name ingested from a provider — awaiting mapping to
 * {@code medical_services}.
 *
 * <p>
 * Table: {@code provider_raw_services} (created in V84)
 *
 * <p>
 * Each (provider_id, raw_name) pair must be unique — enforced by DB constraint.
 */
@Entity
@Table(name = "provider_raw_services")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderRawService {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK → providers.id — which provider this raw name belongs to */
    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    /** Original service name exactly as supplied by the provider */
    @Column(name = "raw_name", nullable = false, length = 500)
    private String rawName;

    /** Lowercased / whitespace-stripped version used for matching */
    @Column(name = "normalized_name", length = 500)
    private String normalizedName;

    /** Optional service code supplied by the provider */
    @Column(name = "code", length = 100)
    private String code;

    /** OUTPATIENT / INPATIENT / EMERGENCY / ANY */
    @Column(name = "encounter_type", length = 20)
    private String encounterType;

    /** Origin of the raw record: EXCEL_IMPORT, MANUAL, API, … */
    @Column(name = "source", length = 50)
    private String source;

    /** Raw classification/category string from provider Excel */
    @Column(name = "provider_category", length = 255)
    private String providerCategory;

    /** Raw specialty string from provider Excel */
    @Column(name = "provider_specialty", length = 255)
    private String providerSpecialty;

    /** Groups records that arrived in the same bulk import */
    @Column(name = "import_batch_id")
    private Long importBatchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private MappingStatus status = MappingStatus.PENDING;

    /** 0–100 confidence score produced by auto-matching */
    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        if (normalizedName == null && rawName != null) {
            normalizedName = rawName.trim().toLowerCase();
        }
    }
}
