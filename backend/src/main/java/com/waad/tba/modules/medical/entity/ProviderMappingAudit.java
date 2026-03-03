package com.waad.tba.modules.medical.entity;

import com.waad.tba.modules.rbac.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Immutable audit record for every mapping decision.
 *
 * <p>Actions: AUTO_MATCH, MANUAL_MAP, REJECT, UPDATE_MAPPING
 *
 * <p>Table: {@code provider_mapping_audit} (created in V84)
 */
@Entity
@Table(name = "provider_mapping_audit")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderMappingAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** The raw service this audit entry relates to */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_raw_service_id")
    private ProviderRawService providerRawService;

    /**
     * Audit action label.
     * Examples: AUTO_MATCH, MANUAL_MAP, REJECT, UPDATE_MAPPING
     */
    @Column(name = "action", nullable = false, length = 50)
    private String action;

    /** Previous value (e.g. previous mapping status or medical service name) */
    @Column(name = "old_value", columnDefinition = "TEXT")
    private String oldValue;

    /** New value after the action */
    @Column(name = "new_value", columnDefinition = "TEXT")
    private String newValue;

    /** The operator who performed this action (null = system/auto) */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    private User performedBy;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;

    @PrePersist
    void onCreate() {
        if (performedAt == null) {
            performedAt = LocalDateTime.now();
        }
    }
}
