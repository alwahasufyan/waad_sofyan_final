package com.waad.tba.modules.medicaltaxonomy.service;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalCategory;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalSpecialty;
import com.waad.tba.modules.medicaltaxonomy.enums.MedicalServiceStatus;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceCategoryRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalSpecialtyRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;

/**
 * Excel import for medical services.
 *
 * <p><b>Expected columns (row 1 = header, auto-detected by header name):</b>
 * <pre>
 *   code          | name_ar | name_en | category_code | specialty_code | cost
 * </pre>
 * Legacy positional mapping (when no recognised header row found):
 * <pre>
 *   Col A: name       Col B: code   Col C: category_code
 *   Col D: cost       Col E: specialty_code
 * </pre>
 *
 * <p><b>Validation rules:</b>
 * <ul>
 *   <li>name_ar  — required; row rejected if blank</li>
 *   <li>category_code — required; must match an active category; row rejected if not found</li>
 *   <li>specialty_code — optional; must match a non-deleted specialty when provided;
 *       specialty must belong to the resolved category (cross-validation)</li>
 *   <li>Duplicate code → row skipped (not errored)</li>
 *   <li>Duplicate LOWER(name_ar) within same category → row skipped</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MedicalServiceImportService {

    private final MedicalServiceRepository serviceRepository;
    private final MedicalCategoryRepository categoryRepository;
    private final MedicalSpecialtyRepository specialtyRepository;
    private final MedicalServiceCategoryRepository serviceCategoryRepository;

    // ─── Column header constants ────────────────────────────────────────────

    private static final Set<String> COL_CODE          = Set.of("code", "service_code", "servicecode");
    private static final Set<String> COL_NAME_AR       = Set.of("name_ar", "namear", "name", "اسم");
    private static final Set<String> COL_NAME_EN       = Set.of("name_en", "nameen");
    private static final Set<String> COL_CATEGORY_CODE = Set.of("category_code", "categorycode", "category");
    private static final Set<String> COL_SPECIALTY_CODE= Set.of("specialty_code", "specialtycode", "specialty");
    private static final Set<String> COL_COST          = Set.of("cost", "price", "base_price", "baseprice");

    // ─── Result DTO ─────────────────────────────────────────────────────────

    @Getter
    @Builder
    public static class ImportResult {
        private int total;
        private int inserted;
        @Builder.Default private int updated = 0;
        private int skipped;
        private int failed;
        @Builder.Default private int drafts  = 0;
        private List<String> errors;
    }

    // ─── Main entry point ───────────────────────────────────────────────────

    @Transactional
    public ImportResult importExcel(MultipartFile file) {
        log.info("Starting Medical Services import from Excel: {}", file.getOriginalFilename());
        List<String> errors    = new ArrayList<>();
        int inserted = 0, skipped = 0, failed = 0, total = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);

            // Build header → column-index map from row 0
            Map<String, Integer> headerMap = buildHeaderMap(sheet.getRow(0));
            boolean hasHeaders = !headerMap.isEmpty();

            // Pre-load lookup caches
            Map<String, MedicalCategory> categoryCache = loadCategoryCache();
            Map<String, MedicalSpecialty> specialtyCache = loadSpecialtyCache();
            // Dedup: LOWER(name_ar)+categoryId already in DB or this batch
            Set<String> seenKeys = loadExistingNameKeys();

            int startRow = hasHeaders ? 1 : 1;  // always skip row 0 (header or data header)

            for (int r = startRow; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                if (isRowBlank(row)) continue;

                total++;
                try {
                    RowOutcome outcome = processRow(row, r + 1, headerMap, hasHeaders,
                            categoryCache, specialtyCache, seenKeys, errors);
                    switch (outcome) {
                        case INSERTED -> inserted++;
                        case SKIPPED  -> skipped++;
                        case FAILED   -> failed++;
                    }
                } catch (Exception e) {
                    failed++;
                    errors.add("Row " + (r + 1) + ": unexpected error — " + e.getMessage());
                    log.warn("Import row {} failed unexpectedly: {}", r + 1, e.getMessage());
                }
            }

        } catch (Exception e) {
            throw new BusinessRuleException("Failed to process Excel file: " + e.getMessage());
        }

        log.info("Import complete — total={} inserted={} skipped={} failed={}",
                total, inserted, skipped, failed);

        return ImportResult.builder()
                .total(total)
                .inserted(inserted)
                .skipped(skipped)
                .failed(failed)
                .errors(errors)
                .build();
    }

    // ─── Row processing ─────────────────────────────────────────────────────

    private enum RowOutcome { INSERTED, SKIPPED, FAILED }

    private RowOutcome processRow(Row row, int rowNum,
                                  Map<String, Integer> headerMap, boolean hasHeaders,
                                  Map<String, MedicalCategory> categoryCache,
                                  Map<String, MedicalSpecialty> specialtyCache,
                                  Set<String> seenKeys,
                                  List<String> errors) {

        String code         = readCell(row, headerMap, hasHeaders, COL_CODE,          0);
        String nameAr       = readCell(row, headerMap, hasHeaders, COL_NAME_AR,        1);
        String nameEn       = readCell(row, headerMap, hasHeaders, COL_NAME_EN,        2);
        String categoryCode = readCell(row, headerMap, hasHeaders, COL_CATEGORY_CODE,  3);
        String specialtyCode= readCell(row, headerMap, hasHeaders, COL_SPECIALTY_CODE, 4);
        String costStr      = readCell(row, headerMap, hasHeaders, COL_COST,           5);

        // ── Mandatory: name_ar ──────────────────────────────────────────────
        if (nameAr == null || nameAr.isBlank()) {
            errors.add("Row " + rowNum + ": name_ar is required — row rejected");
            return RowOutcome.FAILED;
        }

        // ── Mandatory: category_code ────────────────────────────────────────
        if (categoryCode == null || categoryCode.isBlank()) {
            errors.add("Row " + rowNum + ": category_code is required — row rejected");
            return RowOutcome.FAILED;
        }
        MedicalCategory category = categoryCache.get(categoryCode.trim().toLowerCase());
        if (category == null) {
            errors.add("Row " + rowNum + ": category_code '" + categoryCode + "' not found — row rejected");
            return RowOutcome.FAILED;
        }

        // ── Optional: specialty_code ────────────────────────────────────────
        MedicalSpecialty specialty = null;
        if (specialtyCode != null && !specialtyCode.isBlank()) {
            specialty = specialtyCache.get(specialtyCode.trim().toLowerCase());
            if (specialty == null) {
                errors.add("Row " + rowNum + ": specialty_code '" + specialtyCode + "' not found — row rejected");
                return RowOutcome.FAILED;
            }
            if (Boolean.TRUE.equals(specialty.getDeleted())) {
                errors.add("Row " + rowNum + ": specialty '" + specialtyCode + "' is deleted — row rejected");
                return RowOutcome.FAILED;
            }
            // Cross-validate: specialty must belong to the resolved category
            if (specialty.getCategoryId() != null
                    && !specialty.getCategoryId().equals(category.getId())) {
                errors.add("Row " + rowNum + ": specialty '" + specialtyCode
                        + "' does not belong to category '" + categoryCode + "' — row rejected");
                return RowOutcome.FAILED;
            }
        }

        // ── Dedup: LOWER(name_ar) + categoryId ─────────────────────────────
        String dedupKey = nameAr.trim().toLowerCase() + "|" + category.getId();
        if (seenKeys.contains(dedupKey)) {
            log.debug("Row {}: duplicate name_ar '{}' in category {} — skipped", rowNum, nameAr, categoryCode);
            return RowOutcome.SKIPPED;
        }

        // ── Auto-generate code if missing ───────────────────────────────────
        String finalCode = (code != null && !code.isBlank()) ? code.trim()
                : "MS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // ── Dedup: code ─────────────────────────────────────────────────────
        if (serviceRepository.existsByCode(finalCode)) {
            log.debug("Row {}: code '{}' already exists — skipped", rowNum, finalCode);
            seenKeys.add(dedupKey);
            return RowOutcome.SKIPPED;
        }

        // ── Build entity ────────────────────────────────────────────────────
        MedicalService service = MedicalService.builder()
                .code(finalCode)
                .name(nameAr)
                .nameAr(nameAr)
                .nameEn(nameEn)
                .categoryId(category.getId())
                .specialty(specialty)
                .status(MedicalServiceStatus.ACTIVE)
                .active(true)
                .isMaster(false)
                .build();

        if (costStr != null && !costStr.isBlank()) {
            try { service.setCost(new BigDecimal(costStr.replace(",", ""))); }
            catch (NumberFormatException ignored) {}
        }

        service = serviceRepository.save(service);

        // ── Auto-link junction table ────────────────────────────────────────
        serviceCategoryRepository.insertIfAbsent(service.getId(), category.getId());

        seenKeys.add(dedupKey);
        log.debug("Row {}: inserted service {} ({})", rowNum, finalCode, nameAr);
        return RowOutcome.INSERTED;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private Map<String, Integer> buildHeaderMap(Row headerRow) {
        Map<String, Integer> map = new LinkedHashMap<>();
        if (headerRow == null) return map;
        for (Cell cell : headerRow) {
            String v = getCellString(cell);
            if (v != null && !v.isBlank()) {
                map.put(v.trim().toLowerCase(), cell.getColumnIndex());
            }
        }
        return map;
    }

    private String readCell(Row row, Map<String, Integer> headerMap, boolean hasHeaders,
                             Set<String> aliases, int fallbackCol) {
        if (hasHeaders) {
            for (String alias : aliases) {
                Integer idx = headerMap.get(alias);
                if (idx != null) {
                    String v = getCellString(row.getCell(idx));
                    if (v != null && !v.isBlank()) return v;
                }
            }
        }
        Cell cell = row.getCell(fallbackCol, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        return getCellString(cell);
    }

    private String getCellString(Cell cell) {
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try { yield cell.getStringCellValue().trim(); }
                catch (Exception e) { yield String.valueOf(cell.getNumericCellValue()); }
            }
            default -> null;
        };
    }

    private boolean isRowBlank(Row row) {
        for (Cell c : row) {
            String v = getCellString(c);
            if (v != null && !v.isBlank()) return false;
        }
        return true;
    }

    private Map<String, MedicalCategory> loadCategoryCache() {
        Map<String, MedicalCategory> cache = new HashMap<>();
        categoryRepository.findAll().forEach(c -> {
            if (c.getCode()   != null) cache.put(c.getCode().trim().toLowerCase(), c);
            if (c.getName()   != null) cache.put(c.getName().trim().toLowerCase(), c);
            if (c.getNameAr() != null) cache.put(c.getNameAr().trim().toLowerCase(), c);
        });
        return cache;
    }

    private Map<String, MedicalSpecialty> loadSpecialtyCache() {
        Map<String, MedicalSpecialty> cache = new HashMap<>();
        specialtyRepository.findAll().forEach(s -> {
            if (s.getCode()   != null) cache.put(s.getCode().trim().toLowerCase(), s);
            if (s.getNameAr() != null) cache.put(s.getNameAr().trim().toLowerCase(), s);
            if (s.getNameEn() != null) cache.put(s.getNameEn().trim().toLowerCase(), s);
        });
        return cache;
    }

    private Set<String> loadExistingNameKeys() {
        Set<String> keys = new HashSet<>();
        serviceRepository.findAll().forEach(svc -> {
            if (svc.getNameAr() != null && svc.getCategoryId() != null) {
                keys.add(svc.getNameAr().trim().toLowerCase() + "|" + svc.getCategoryId());
            }
            if (svc.getName() != null && svc.getCategoryId() != null) {
                keys.add(svc.getName().trim().toLowerCase() + "|" + svc.getCategoryId());
            }
        });
        return keys;
    }
}

