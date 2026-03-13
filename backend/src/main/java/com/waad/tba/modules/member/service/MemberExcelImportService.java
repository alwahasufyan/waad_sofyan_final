package com.waad.tba.modules.member.service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.modules.benefitpolicy.entity.BenefitPolicy;
import com.waad.tba.modules.benefitpolicy.repository.BenefitPolicyRepository;
import com.waad.tba.modules.employer.entity.Employer;
import com.waad.tba.modules.employer.repository.EmployerRepository;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.EmployerOptionDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.BenefitPolicyOptionDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.ImportValidationErrorDto;
import com.waad.tba.modules.member.dto.MemberImportPreviewDto.MemberImportRowDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto;
import com.waad.tba.modules.member.dto.MemberImportResultDto.ImportErrorDetailDto;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.entity.MemberImportError;
import com.waad.tba.modules.member.entity.MemberImportLog;
import com.waad.tba.modules.member.repository.MemberImportErrorRepository;
import com.waad.tba.modules.member.repository.MemberImportLogRepository;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.rbac.entity.User;
import com.waad.tba.security.AuthorizationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service for importing members from Excel files.
 * Orchestrates the import process using dedicated components for parsing, mapping, and processing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberExcelImportService {

    private static final int BATCH_SIZE = 100;

    private final MemberRepository memberRepository;
    private final MemberImportLogRepository importLogRepository;
    private final MemberImportErrorRepository importErrorRepository;
    private final EmployerRepository employerRepository;
    private final BenefitPolicyRepository benefitPolicyRepository;
    private final AuthorizationService authorizationService;
    private final ObjectMapper objectMapper;
    
    private final MemberImportParser parser;
    private final MemberImportMapper mapper;
    private final MemberImportRowProcessor rowProcessor;

    public MemberImportPreviewDto parseAndPreview(MultipartFile file) throws Exception {
        return parseAndPreview(file, null, null, null);
    }

    public MemberImportPreviewDto parseAndPreview(MultipartFile file, Map<String, String> customMappings)
            throws Exception {
        return parseAndPreview(file, customMappings, null, null);
    }

    public MemberImportPreviewDto parseAndPreview(
            MultipartFile file,
            Map<String, String> customMappings,
            Integer headerRowNumber) throws Exception {
        return parseAndPreview(file, customMappings, headerRowNumber, null);
    }

    public MemberImportPreviewDto parseAndPreview(
            MultipartFile file,
            Map<String, String> customMappings,
            Integer headerRowNumber,
            Long defaultEmployerId) throws Exception {
        
        log.info("📊 Parsing Excel file for preview: {} (custom mappings: {})",
                file.getOriginalFilename(), customMappings != null ? "yes" : "auto");

        Employer defaultEmployer = null;
        if (defaultEmployerId != null) {
            defaultEmployer = employerRepository.findById(defaultEmployerId)
                    .orElseThrow(() -> new BusinessRuleException("صاحب العمل غير موجود: " + defaultEmployerId));
        }

        String batchId = UUID.randomUUID().toString();
        List<MemberImportRowDto> previewRows = new ArrayList<>();
        List<ImportValidationErrorDto> validationErrors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        Map<String, String> columnMappings = new LinkedHashMap<>();
        List<String> detectedColumns = new ArrayList<>();

        int newCount = 0;
        int warningCount = 0;
        int errorCount = 0;
        int validRows = 0;
        int invalidRows = 0;

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            int physicalLastRow = sheet.getLastRowNum();

            int resolvedHeaderRowNumber = headerRowNumber != null
                    ? Math.max(0, headerRowNumber)
                    : mapper.detectHeaderRowNumber(sheet);

            Row headerRow = sheet.getRow(resolvedHeaderRowNumber);
            if (headerRow == null) throw new BusinessRuleException("Excel file has no header row");

            Map<Integer, String> columnIndexToName = new HashMap<>();
            Map<String, Integer> fieldToColumnIndex = new HashMap<>();

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                String colName = parser.getCellStringValue(headerRow.getCell(i));
                if (colName == null) colName = "";
                String cleanedColName = parser.cleanColumnName(colName);
                String normalizedColName = cleanedColName.toLowerCase();
                columnIndexToName.put(i, normalizedColName);
                detectedColumns.add(cleanedColName);
            }

            if (customMappings != null && !customMappings.isEmpty()) {
                for (Map.Entry<String, String> entry : customMappings.entrySet()) {
                    String excelColumn = entry.getKey().trim().toLowerCase();
                    String systemField = entry.getValue();
                    Integer columnIndex = mapper.findColumnIndexByName(excelColumn, columnIndexToName);
                    if (columnIndex != null) {
                        fieldToColumnIndex.put(systemField, columnIndex);
                        columnMappings.put(systemField, excelColumn);
                    }
                }
            } else {
                for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                    String colName = columnIndexToName.get(i);
                    mapper.mapColumnToField(colName, i, fieldToColumnIndex, columnMappings);
                }
            }

            int totalRows = Math.max(0, physicalLastRow - resolvedHeaderRowNumber);
            mapper.validateMandatoryColumns(fieldToColumnIndex, validationErrors);

            int previewLimit = Math.min(totalRows, 50);
            Set<String> seenCardNumbers = new HashSet<>();

            for (int rowIndex = resolvedHeaderRowNumber + 1; rowIndex <= physicalLastRow; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || parser.isEmptyRow(row)) continue;

                int displayRowNumber = rowIndex - resolvedHeaderRowNumber;
                MemberImportRowDto rowDto = rowProcessor.parseRowForPreview(row, displayRowNumber, fieldToColumnIndex,
                        validationErrors, seenCardNumbers, defaultEmployer);

                if ("ERROR".equals(rowDto.getStatus())) {
                    errorCount++;
                    invalidRows++;
                } else {
                    newCount++;
                    validRows++;
                    if ("WARNING".equals(rowDto.getStatus())) warningCount++;
                }

                if (previewRows.size() < previewLimit) previewRows.add(rowDto);
            }

            int importableCount = newCount;
            if (totalRows > previewLimit) warnings.add(String.format("عرض أول %d صف من إجمالي %d صف", previewLimit, totalRows));
            if (warningCount > 0) warnings.add(String.format("%d صف بها تحذيرات - ستُستورد مع ملاحظات", warningCount));
            if (errorCount > 0) warnings.add(String.format("%d صف بها أخطاء - سيتم تخطيها", errorCount));
            if (importableCount == 0) warnings.add("لا يوجد صفوف صالحة للاستيراد");

            return MemberImportPreviewDto.builder()
                    .batchId(batchId).fileName(file.getOriginalFilename()).totalRows(totalRows)
                    .validRows(validRows).invalidRows(invalidRows).newCount(newCount).updateCount(0)
                    .warningCount(warningCount).errorCount(errorCount).detectedColumns(detectedColumns)
                    .columnMappings(columnMappings).previewRows(previewRows).validationErrors(validationErrors)
                    .errors(validationErrors).canProceed(importableCount > 0).matchKeyUsed("CARD_NUMBER").warnings(warnings)
                    .availableEmployers(loadEmployerOptions())
                    .availableBenefitPolicies(loadPolicyOptions())
                    .build();
        }
    }

    public MemberImportResultDto executeImport(MultipartFile file, String batchId, Long employerId, Long benefitPolicyId) throws Exception {
        return executeImport(file, batchId, employerId, benefitPolicyId, null);
    }

    public MemberImportResultDto executeImport(MultipartFile file, String batchId, Long employerId, Long benefitPolicyId, Integer headerRowNumber) throws Exception {
        log.info("📥 Executing member import: batchId={}, file={}, employer={}, policy={}", batchId, file.getOriginalFilename(), employerId, benefitPolicyId);

        MemberImportPreviewDto previewGuard = parseAndPreview(file, null, headerRowNumber, employerId);
        if (previewGuard.getValidRows() <= 0) throw new BusinessRuleException("لا يوجد صفوف صالحة للاستيراد");

        Employer defaultEmployer = employerId != null ? employerRepository.findById(employerId).orElseThrow(() -> new BusinessRuleException("صاحب العمل غير موجود")) : null;
        BenefitPolicy benefitPolicy = benefitPolicyId != null ? benefitPolicyRepository.findById(benefitPolicyId).orElseThrow(() -> new BusinessRuleException("وثيقة المنافع غير موجودة")) : null;

        User currentUser = authorizationService.getCurrentUser();
        MemberImportLog importLog = importLogRepository.findByImportBatchId(batchId).orElseGet(() -> MemberImportLog.builder().importBatchId(batchId).build());

        importLog.setFileName(file.getOriginalFilename());
        importLog.setFileSizeBytes(file.getSize());
        importLog.setImportedByUserId(currentUser != null ? currentUser.getId() : null);
        importLog.setImportedByUsername(currentUser != null ? currentUser.getUsername() : "system");
        importLog.markStarted();
        importLog = importLogRepository.save(importLog);

        importErrorRepository.deleteByImportLogId(importLog.getId());

        List<ImportErrorDetailDto> errors = new ArrayList<>();
        List<Member> memberBuffer = new ArrayList<>();
        int totalProcessed = 0, createdCount = 0, skippedCount = 0, errorCount = 0;

        try (InputStream is = file.getInputStream(); Workbook workbook = new XSSFWorkbook(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            int physicalLastRow = sheet.getLastRowNum();
            int resolvedHeaderRowNumber = headerRowNumber != null ? Math.max(0, headerRowNumber) : mapper.detectHeaderRowNumber(sheet);
            importLog.setTotalRows(Math.max(0, physicalLastRow - resolvedHeaderRowNumber));

            Row headerRow = sheet.getRow(resolvedHeaderRowNumber);
            Map<Integer, String> columnIndexToName = new HashMap<>();
            Map<String, Integer> fieldToColumnIndex = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                String colName = parser.cleanColumnName(parser.getCellStringValue(headerRow.getCell(i))).toLowerCase();
                columnIndexToName.put(i, colName);
                mapper.mapColumnToField(colName, i, fieldToColumnIndex, new HashMap<>());
            }

            for (int rowIndex = resolvedHeaderRowNumber + 1; rowIndex <= physicalLastRow; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null || parser.isEmptyRow(row)) { skippedCount++; continue; }
                totalProcessed++;
                int rowNum = rowIndex - resolvedHeaderRowNumber;

                try {
                    Member member = rowProcessor.processRowForImport(row, rowNum, fieldToColumnIndex, defaultEmployer, benefitPolicy);
                    memberBuffer.add(member);
                    createdCount++;
                    importLog.incrementCreated();
                    if (memberBuffer.size() >= BATCH_SIZE) {
                        memberRepository.saveAll(memberBuffer);
                        memberBuffer.clear();
                    }
                } catch (Exception e) {
                    errorCount++;
                    importLog.incrementError();
                    String rowJson = rowToJson(row, columnIndexToName);
                    importErrorRepository.save(MemberImportError.systemError(importLog, rowNum, e.getMessage(), rowJson));
                    errors.add(ImportErrorDetailDto.builder().rowNumber(rowNum).errorType("SYSTEM").message(e.getMessage()).build());
                }
            }
            if (!memberBuffer.isEmpty()) memberRepository.saveAll(memberBuffer);

            importLog.setCreatedCount(createdCount);
            importLog.setErrorCount(errorCount);
            importLog.markCompleted();
            importLogRepository.save(importLog);

            return MemberImportResultDto.builder()
                    .batchId(batchId).status(importLog.getStatus().name()).totalProcessed(totalProcessed)
                    .createdCount(createdCount).updatedCount(0).skippedCount(skippedCount).errorCount(errorCount)
                    .processingTimeMs(importLog.getProcessingTimeMs()).completedAt(importLog.getCompletedAt())
                    .successRate(totalProcessed > 0 ? (double) createdCount / totalProcessed * 100 : 0)
                    .errors(errors).message(String.format("تم استيراد %d عضو بنجاح، %d أخطاء", createdCount, errorCount))
                    .build();
        } catch (Exception e) {
            importLog.markFailed(e.getMessage());
            importLogRepository.save(importLog);
            throw e;
        }
    }

    private List<EmployerOptionDto> loadEmployerOptions() {
        return employerRepository.findAll().stream()
                .map(e -> EmployerOptionDto.builder().id(e.getId()).code(e.getCode()).name(e.getName()).active(e.getActive()).build())
                .toList();
    }

    private List<BenefitPolicyOptionDto> loadPolicyOptions() {
        return benefitPolicyRepository.findAll().stream()
                .map(p -> BenefitPolicyOptionDto.builder().id(p.getId()).policyNumber(p.getPolicyCode()).name(p.getName())
                        .employerId(p.getEmployer() != null ? p.getEmployer().getId() : null)
                        .isActive(p.getStatus() == BenefitPolicy.BenefitPolicyStatus.ACTIVE).build())
                .toList();
    }

    private String rowToJson(Row row, Map<Integer, String> columnIndexToName) {
        Map<String, String> data = new HashMap<>();
        for (Map.Entry<Integer, String> entry : columnIndexToName.entrySet()) {
            String value = parser.getCellStringValue(row.getCell(entry.getKey()));
            if (value != null) data.put(entry.getValue(), value);
        }
        try { return objectMapper.writeValueAsString(data); } catch (JsonProcessingException e) { return "{}"; }
    }
}
