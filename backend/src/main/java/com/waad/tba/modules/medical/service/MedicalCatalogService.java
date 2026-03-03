package com.waad.tba.modules.medical.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.modules.medical.dto.CatalogSearchResultDto;
import com.waad.tba.modules.medical.dto.CatalogServiceDto;
import com.waad.tba.modules.medical.dto.CatalogTreeCategoryDto;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.extern.slf4j.Slf4j;

/**
 * Read-only service for the Unified Medical Catalog view.
 *
 * <p>Design constraints:
 * <ul>
 *   <li>Single SQL query for the tree — no N+1</li>
 *   <li>No entity exposure in responses</li>
 *   <li>Does NOT modify medical_services, categories, or pricing</li>
 * </ul>
 *
 * <p>Tree query joins:
 * {@code medical_categories → medical_service_categories → medical_services}
 * excluding soft-deleted rows.
 */
@Slf4j
@Service
public class MedicalCatalogService {

    @PersistenceContext
    private EntityManager em;

    // ═══════════════════════════════════════════════════════════════════════
    // TREE ENDPOINT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Returns the full hierarchical catalog tree.
     *
     * <p>Single query — results are pivoted in-memory by category.
     * Categories with no active services are excluded.
     * Ordered by category.code, then service.code.
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<CatalogTreeCategoryDto> getTree() {
        log.debug("Building medical catalog tree (single-query)");

        String sql = """
                SELECT mc.id            AS category_id,
                       mc.code          AS category_code,
                       mc.name_ar       AS category_name_ar,
                       mc.name_en       AS category_name_en,
                       ms.id            AS service_id,
                       ms.code          AS service_code,
                       ms.name_ar       AS service_name_ar,
                       ms.name_en       AS service_name_en,
                       ms.is_master     AS is_master,
                       ms.active        AS service_active,
                       sp.id            AS specialty_id,
                       sp.code          AS specialty_code,
                       sp.name_ar       AS specialty_name_ar
                FROM   medical_categories mc
                JOIN   medical_service_categories msc ON msc.category_id = mc.id
                JOIN   medical_services ms            ON ms.id = msc.service_id
                LEFT JOIN medical_specialties sp      ON sp.id = ms.specialty_id
                                                     AND sp.deleted = false
                WHERE  mc.deleted  = false
                  AND  ms.deleted  = false
                ORDER BY mc.code, ms.code
                """;

        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        // Pivot flat result → category-keyed tree (insertion-order preserved)
        Map<Long, CatalogTreeCategoryDto> byCategory = new LinkedHashMap<>();

        for (Object[] r : rows) {
            Long catId = toLong(r[0]);

            CatalogTreeCategoryDto category = byCategory.computeIfAbsent(catId, id ->
                    CatalogTreeCategoryDto.builder()
                            .categoryId(catId)
                            .code((String) r[1])
                            .nameAr((String) r[2])
                            .nameEn((String) r[3])
                            .services(new ArrayList<>())
                            .build());

            category.getServices().add(
                    CatalogServiceDto.builder()
                            .id(toLong(r[4]))
                            .code((String) r[5])
                            .nameAr((String) r[6])
                            .nameEn((String) r[7])
                            .isMaster(toBoolean(r[8]))
                            .active(toBoolean(r[9]))
                            .specialtyId(r[10] != null ? toLong(r[10]) : null)
                            .specialtyCode((String) r[11])
                            .specialtyNameAr((String) r[12])
                            .build());
        }

        log.debug("Catalog tree built: {} categories, {} total services",
                byCategory.size(),
                byCategory.values().stream().mapToInt(c -> c.getServices().size()).sum());

        return new ArrayList<>(byCategory.values());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SEARCH ENDPOINT
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Full-text ILIKE search across service code, nameAr, nameEn, and aliases.
     *
     * <p>Returns at most 50 distinct results ordered by service code.
     * Aliases are searched via LEFT JOIN — no duplicates due to DISTINCT.
     *
     * @param q raw query string (min 1 char; returns empty list if blank)
     */
    @Transactional(readOnly = true)
    @SuppressWarnings("unchecked")
    public List<CatalogSearchResultDto> search(String q) {
        if (q == null || q.isBlank()) {
            return List.of();
        }

        String pattern = "%" + q.trim().toLowerCase() + "%";
        log.debug("Catalog search: q='{}' pattern='{}'", q, pattern);

        String sql = """
                SELECT DISTINCT
                       ms.id            AS service_id,
                       ms.code          AS service_code,
                       ms.name_ar       AS service_name_ar,
                       ms.name_en       AS service_name_en,
                       ms.is_master     AS is_master,
                       ms.active        AS service_active,
                       mc.id            AS category_id,
                       mc.code          AS category_code,
                       mc.name_ar       AS category_name_ar,
                       sp.id            AS specialty_id,
                       sp.code          AS specialty_code,
                       sp.name_ar       AS specialty_name_ar
                FROM   medical_services ms
                LEFT JOIN medical_service_categories msc
                       ON  msc.service_id  = ms.id
                LEFT JOIN medical_categories mc
                       ON  mc.id           = msc.category_id
                      AND  mc.deleted      = false
                LEFT JOIN ent_service_aliases esa
                       ON  esa.medical_service_id = ms.id
                LEFT JOIN medical_specialties sp
                       ON  sp.id = ms.specialty_id
                      AND  sp.deleted = false
                WHERE  ms.deleted = false
                  AND (
                         LOWER(ms.code)         LIKE :pattern
                      OR LOWER(ms.name_ar)      LIKE :pattern
                      OR LOWER(ms.name_en)      LIKE :pattern
                      OR LOWER(esa.alias_text)  LIKE :pattern
                  )
                ORDER BY ms.code
                LIMIT 50
                """;

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("pattern", pattern)
                .getResultList();

        return rows.stream()
                .map(r -> CatalogSearchResultDto.builder()
                        .id(toLong(r[0]))
                        .code((String) r[1])
                        .nameAr((String) r[2])
                        .nameEn((String) r[3])
                        .isMaster(toBoolean(r[4]))
                        .active(toBoolean(r[5]))
                        .categoryId(r[6] != null ? toLong(r[6]) : null)
                        .categoryCode((String) r[7])
                        .categoryNameAr((String) r[8])
                        .specialtyId(r[9] != null ? toLong(r[9]) : null)
                        .specialtyCode((String) r[10])
                        .specialtyNameAr((String) r[11])
                        .build())
                .collect(Collectors.toList());
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private static Long toLong(Object o) {
        return o == null ? null : ((Number) o).longValue();
    }

    private static boolean toBoolean(Object o) {
        if (o == null) return false;
        if (o instanceof Boolean b) return b;
        // PostgreSQL may return numeric 0/1 via some JDBC drivers
        return ((Number) o).intValue() != 0;
    }
}
