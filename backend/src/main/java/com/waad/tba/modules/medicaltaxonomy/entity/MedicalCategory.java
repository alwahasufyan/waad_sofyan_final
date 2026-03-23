package com.waad.tba.modules.medicaltaxonomy.entity;

import com.waad.tba.modules.medicaltaxonomy.enums.CategoryContext;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Medical Category Entity (Reference Data)
 * 
 * Purpose: Classification of medical services into hierarchical categories
 * Scope: Pure reference data (NO coverage, claim, provider, or network logic)
 * 
 * Examples:
 * - Root: MEDICAL, DENTAL, VISION, PHARMACY
 * - Level 2: CONSULTATION, SURGERY, LAB, IMAGING
 * - Level 3: CARDIOLOGY_CONSULT, ORTHOPEDIC_SURGERY, etc.
 */
@Entity
@Table(name = "medical_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MedicalCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Unique business identifier (immutable)
     * Examples: "CONSULTATION", "SURGERY", "CARDIOLOGY_CONSULT"
     */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    /**
     * Legacy category code column kept for runtime compatibility.
     */
    @Column(name = "category_code", nullable = false, length = 50)
    private String categoryCode;

    /**
     * Category name (unified - Arabic-only system)
     */
    @Column(name = "name", nullable = false, length = 200)
    private String name;

    /**
     * Legacy category name column kept for runtime compatibility.
     */
    @Column(name = "category_name", nullable = false, length = 200)
    private String categoryName;

    /**
     * Legacy Arabic category name column kept for runtime compatibility.
     */
    @Column(name = "category_name_ar", length = 200)
    private String categoryNameAr;

    /**
     * Parent category for hierarchy support (Legacy support)
     * NULL = root category
     * NOT NULL = subcategory
     */
    @Column(name = "parent_id")
    private Long parentId;

    /**
     * Many-to-Many roots (Multi-context support)
     * Allows a category (e.g. Lab) to belong to multiple roots (OP, IP, etc.)
     */
    @jakarta.persistence.ManyToMany(fetch = jakarta.persistence.FetchType.LAZY)
    @jakarta.persistence.JoinTable(name = "medical_category_roots", joinColumns = @jakarta.persistence.JoinColumn(name = "category_id"), inverseJoinColumns = @jakarta.persistence.JoinColumn(name = "root_id"))
    @Builder.Default
    private java.util.Set<MedicalCategory> roots = new java.util.HashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "context", length = 20)
    @Builder.Default
    private CategoryContext context = CategoryContext.ANY;

    /**
     * Arabic display name (unified catalog — bilingual support)
     */
    @Column(name = "name_ar", length = 200)
    private String nameAr;

    /**
     * English display name (unified catalog — bilingual support)
     */
    @Column(name = "name_en", length = 200)
    private String nameEn;

    /**
     * Admin-managed target coverage percentage (0–100).
     * NULL = not configured yet.
     */
    @Column(name = "coverage_percent", precision = 5, scale = 2)
    private BigDecimal coveragePercent;

    /**
     * Soft-delete flag (unified catalog pattern)
     */
    @Column(name = "deleted", nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /**
     * Timestamp when the record was soft-deleted
     */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    /**
     * ID of the user who soft-deleted this record
     */
    @Column(name = "deleted_by")
    private Long deletedBy;

    /**
     * Soft delete flag (legacy — kept for backward compat)
     */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Audit: creation timestamp
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Audit: last update timestamp
     */
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        syncLegacyColumns();
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        syncLegacyColumns();
        updatedAt = LocalDateTime.now();
    }

    private void syncLegacyColumns() {
        if ((code == null || code.isBlank()) && categoryCode != null && !categoryCode.isBlank()) {
            code = categoryCode;
        }
        if ((categoryCode == null || categoryCode.isBlank()) && code != null && !code.isBlank()) {
            categoryCode = code;
        }

        if ((name == null || name.isBlank()) && categoryName != null && !categoryName.isBlank()) {
            name = categoryName;
        }
        if ((categoryName == null || categoryName.isBlank()) && name != null && !name.isBlank()) {
            categoryName = name;
        }

        if ((nameAr == null || nameAr.isBlank()) && categoryNameAr != null && !categoryNameAr.isBlank()) {
            nameAr = categoryNameAr;
        }
        if ((categoryNameAr == null || categoryNameAr.isBlank()) && nameAr != null && !nameAr.isBlank()) {
            categoryNameAr = nameAr;
        }
    }
}
