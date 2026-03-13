package com.waad.tba.modules.member.service;

import java.util.List;
import java.util.Map;

import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.springframework.stereotype.Component;

import com.waad.tba.modules.member.dto.MemberImportPreviewDto.ImportValidationErrorDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Handles mapping between Excel columns and Member fields/attributes.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MemberImportMapper {

    private final MemberImportParser parser;

    public int detectHeaderRowNumber(Sheet sheet) {
        int scanLimit = Math.min(sheet.getLastRowNum(), 20);
        int bestRow = 0;
        int bestScore = Integer.MIN_VALUE;

        for (int rowIndex = 0; rowIndex <= scanLimit; rowIndex++) {
            Row row = sheet.getRow(rowIndex);
            if (row == null) {
                continue;
            }

            int score = 0;
            for (int cellIndex = 0; cellIndex < row.getLastCellNum(); cellIndex++) {
                String raw = parser.getCellStringValue(row.getCell(cellIndex));
                String normalized = parser.cleanColumnName(raw).toLowerCase();
                if (normalized.isBlank()) {
                    continue;
                }

                if (containsAny(normalized, MemberImportFieldConfig.MANDATORY_COLUMNS.get(0))) {
                    score += 10;
                }
                if (containsAny(normalized, MemberImportFieldConfig.MANDATORY_COLUMNS.get(1))) {
                    score += 10;
                }

                for (String[] variants : MemberImportFieldConfig.MANDATORY_COLUMNS) {
                    if (containsAny(normalized, variants)) {
                        score += 2;
                    }
                }

                for (String[] variants : MemberImportFieldConfig.OPTIONAL_FIELD_MAPPINGS.values()) {
                    if (containsAny(normalized, variants)) {
                        score += 1;
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestRow = rowIndex;
            }
        }

        log.info("📌 Header row detection: chosen row={} score={}", bestRow, bestScore);
        return bestRow;
    }

    public void mapColumnToField(String colName, int index,
            Map<String, Integer> fieldToColumnIndex, Map<String, String> columnMappings) {

        if (colName == null || colName.isBlank()) {
            return;
        }

        for (int i = 0; i < MemberImportFieldConfig.MANDATORY_COLUMNS.size(); i++) {
            String[] variants = MemberImportFieldConfig.MANDATORY_COLUMNS.get(i);
            String fieldName = i == 0 ? "fullName" : "employer";

            for (String variant : variants) {
                if (colName.equalsIgnoreCase(variant) || colName.toLowerCase().contains(variant.toLowerCase())) {
                    fieldToColumnIndex.put(fieldName, index);
                    columnMappings.put(colName, fieldName);
                    return;
                }
            }
        }

        for (Map.Entry<String, String[]> entry : MemberImportFieldConfig.OPTIONAL_FIELD_MAPPINGS.entrySet()) {
            for (String variant : entry.getValue()) {
                if (colName.equalsIgnoreCase(variant) || colName.toLowerCase().contains(variant.toLowerCase())) {
                    fieldToColumnIndex.put(entry.getKey(), index);
                    columnMappings.put(colName, entry.getKey());
                    return;
                }
            }
        }

        for (Map.Entry<String, String[]> entry : MemberImportFieldConfig.ATTRIBUTE_MAPPINGS.entrySet()) {
            for (String variant : entry.getValue()) {
                if (colName.equalsIgnoreCase(variant) || colName.toLowerCase().contains(variant.toLowerCase())) {
                    fieldToColumnIndex.put("attr:" + entry.getKey(), index);
                    columnMappings.put(colName, "attribute:" + entry.getKey());
                    return;
                }
            }
        }

        String normalized = colName.replaceAll("[^a-z0-9_]", "_").replaceAll("_+", "_");
        if (!normalized.isBlank()) {
            fieldToColumnIndex.put("attr:" + normalized, index);
            columnMappings.put(colName, "attribute:" + normalized);
        }
    }

    public void validateMandatoryColumns(Map<String, Integer> fieldToColumnIndex,
            List<ImportValidationErrorDto> errors) {

        if (!fieldToColumnIndex.containsKey("fullName")) {
            errors.add(ImportValidationErrorDto.builder()
                    .rowNumber(0).field("header").severity("ERROR")
                    .message("Missing mandatory column: full_name / name (الاسم الكامل)").build());
        }
        if (!fieldToColumnIndex.containsKey("employer")) {
            errors.add(ImportValidationErrorDto.builder()
                    .rowNumber(0).field("header").severity("ERROR")
                    .message("Missing mandatory column: employer / company (جهة العمل)").build());
        }
    }

    private boolean containsAny(String haystack, String[] variants) {
        for (String variant : variants) {
            if (variant != null && !variant.isBlank() && haystack.contains(variant.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    public Integer findColumnIndexByName(String columnName, Map<Integer, String> columnIndexToName) {
        String lowerName = columnName.toLowerCase();
        for (Map.Entry<Integer, String> entry : columnIndexToName.entrySet()) {
            if (entry.getValue().equals(lowerName)) {
                return entry.getKey();
            }
        }
        return null;
    }
}
