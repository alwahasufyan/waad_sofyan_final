package com.waad.tba.modules.medical.entity;

import com.waad.tba.modules.medical.enums.MappingStatus;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.rbac.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Resolved mapping from a {@link ProviderRawService} to a canonical {@link MedicalService}.
 *
 * <p>One raw service can have at most one active mapping (enforced by the UNIQUE constraint
 * on {@code provider_raw_service_id}).
 *
 * <p>Table: {@code provider_service_mappings} (created in V84)
 */
@Entity
@Table(name = "provider_service_mappings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderServiceMapping {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The raw service being mapped.
     * UNIQUE constraint ensures at most one mapping per raw service.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_raw_service_id", nullable = false)
    private ProviderRawService providerRawService;

    /**
     * The canonical medical service this raw name resolves to.
     * ON DELETE RESTRICT — cannot delete a medical_service that has active mappings.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medical_service_id", nullable = false)
    private MedicalService medicalService;

    @Enumerated(EnumType.STRING)
    @Column(name = "mapping_status", nullable = false, length = 30)
    private MappingStatus mappingStatus;

    /** The user who confirmed or created this mapping (null for AUTO_MATCHED) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapped_by")
    private User mappedBy;

    @Column(name = "mapped_at", nullable = false)
    private LocalDateTime mappedAt;

    /** Confidence score; 100 for exact auto-match, lower for partial matches */
    @Column(name = "confidence_score", precision = 5, scale = 2)
    private BigDecimal confidenceScore;

    @PrePersist
    void onCreate() {
        if (mappedAt == null) {
            mappedAt = LocalDateTime.now();
        }
    }
}
