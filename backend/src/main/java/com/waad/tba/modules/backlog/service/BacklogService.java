package com.waad.tba.modules.backlog.service;

import com.waad.tba.common.enums.NetworkType;
import com.waad.tba.modules.backlog.dto.BacklogClaimRequest;
import com.waad.tba.modules.backlog.dto.BacklogImportResponse;
import com.waad.tba.modules.backlog.dto.BacklogServiceLineDto;
import com.waad.tba.modules.claim.entity.*;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.member.repository.MemberRepository;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.visit.entity.Visit;
import com.waad.tba.modules.visit.entity.VisitStatus;
import com.waad.tba.modules.visit.entity.VisitType;
import com.waad.tba.modules.visit.repository.VisitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BacklogService {

    private final VisitRepository visitRepository;
    private final ClaimRepository claimRepository;
    private final MemberRepository memberRepository;
    private final ProviderRepository providerRepository;
    private final MedicalServiceRepository medicalServiceRepository;

    @Transactional
    public Long createBacklogClaim(BacklogClaimRequest request, String enteredBy, ClaimSource source) {
        Member member = memberRepository.findById(request.getMemberId())
                .orElseThrow(() -> new IllegalArgumentException("Member not found"));
        
        Provider provider = providerRepository.findById(request.getProviderId())
                .orElseThrow(() -> new IllegalArgumentException("Provider not found"));

        // 1. Create Shadow Visit
        Visit visit = Visit.builder()
                .member(member)
                .employer(member.getEmployer())
                .providerId(provider.getId())
                .visitDate(request.getServiceDate())
                .doctorName(request.getDoctorName() != null ? request.getDoctorName() : "Legacy Doctor")
                .diagnosis(request.getDiagnosis())
                .visitType(VisitType.LEGACY_BACKLOG)
                .status(VisitStatus.COMPLETED)
                .networkStatus(request.getNetworkStatus() != null ? request.getNetworkStatus() : NetworkType.IN_NETWORK)
                .active(true)
                .build();
        
        visit = visitRepository.save(visit);

        // 2. Create Claim
        BigDecimal totalRequested = request.getLines().stream()
                .map(l -> l.getGrossAmount().multiply(new BigDecimal(l.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal totalApproved = request.getLines().stream()
                .map(l -> l.getCoveredAmount().multiply(new BigDecimal(l.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Claim claim = Claim.builder()
                .member(member)
                .visit(visit)
                .providerId(provider.getId())
                .providerName(provider.getName())
                .doctorName(visit.getDoctorName())
                .serviceDate(request.getServiceDate())
                .status(ClaimStatus.SETTLED) // Backlog is settled by default
                .requestedAmount(totalRequested)
                .approvedAmount(totalApproved)
                .differenceAmount(totalRequested.subtract(totalApproved))
                .claimSource(source)
                .legacyReferenceNumber(request.getLegacyReferenceNumber())
                .isBacklog(true)
                .enteredAt(LocalDateTime.now())
                .enteredBy(enteredBy)
                .active(true)
                .build();

        // Financial snapshot defaults
        claim.setPatientCoPay(totalRequested.subtract(totalApproved));
        claim.setNetProviderAmount(totalApproved);

        // 3. Add Claim Lines
        for (BacklogServiceLineDto lineDto : request.getLines()) {
            MedicalService medicalService = medicalServiceRepository.findByCode(lineDto.getServiceCode())
                    .orElse(null);
            
            ClaimLine line = ClaimLine.builder()
                    .claim(claim)
                    .medicalService(medicalService)
                    .serviceCode(lineDto.getServiceCode())
                    .serviceName(lineDto.getServiceName() != null ? lineDto.getServiceName() : 
                                 (medicalService != null ? medicalService.getName() : "خدمة متراكمة"))
                    .serviceCategoryId(medicalService != null && medicalService.getCategoryId() != null ? medicalService.getCategoryId() : null)
                    .serviceCategoryName(medicalService != null ? "Category" : "Backlog")
                    .quantity(lineDto.getQuantity() != null ? lineDto.getQuantity() : 1)
                    .unitPrice(lineDto.getGrossAmount())
                    .totalPrice(lineDto.getGrossAmount().multiply(new BigDecimal(lineDto.getQuantity() != null ? lineDto.getQuantity() : 1)))
                    .coveragePercentSnapshot(lineDto.getCoveragePercent() != null ? lineDto.getCoveragePercent() : 100)
                    .timesLimitSnapshot(lineDto.getTimesLimit())
                    .amountLimitSnapshot(lineDto.getAmountLimit())
                    .build();
            
            claim.addLine(line);
        }

        claim = claimRepository.save(claim);
        return claim.getId();
    }

    @Transactional
    public BacklogImportResponse importExcel(MultipartFile file, String enteredBy) {
        List<BacklogImportResponse.ImportError> errors = new ArrayList<>();
        int successCount = 0;
        int failureCount = 0;
        int totalRows = 0;

        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            
            // Skip header
            if (rowIterator.hasNext()) rowIterator.next();

            int rowIndex = 1;
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                rowIndex++;
                totalRows++;
                
                try {
                    // Mapping Excel columns:
                    // 0: Member Code (civilId or cardNumber)
                    // 1: Provider ID or Name
                    // 2: Service Date
                    // 3: Doctor Name
                    // 4: Diagnosis
                    // 5: Legacy Ref
                    // 6: Service Code
                    // 7: Quantity
                    // 8: Gross Amount
                    // 9: Approved Amount
                    
                    String memberCode = getCellValue(row.getCell(0));
                    String providerRef = getCellValue(row.getCell(1));
                    LocalDate serviceDate = getDateCellValue(row.getCell(2));
                    String doctorName = getCellValue(row.getCell(3));
                    String diagnosis = getCellValue(row.getCell(4));
                    String legacyRef = getCellValue(row.getCell(5));
                    String serviceCode = getCellValue(row.getCell(6));
                    
                    Integer quantity = parseInteger(row.getCell(7), 1);
                    BigDecimal gross = parseBigDecimal(row.getCell(8), BigDecimal.ZERO);
                    BigDecimal approved = parseBigDecimal(row.getCell(9), gross);

                    // Lookups
                    Member member = memberRepository.findByCivilId(memberCode)
                            .or(() -> memberRepository.findByCardNumber(memberCode))
                            .orElseThrow(() -> new RuntimeException("Member not found: " + memberCode));
                    
                    Provider provider = null;
                    if (providerRef.matches("\\d+")) {
                        provider = providerRepository.findById(Long.parseLong(providerRef)).orElse(null);
                    }
                    if (provider == null) {
                        provider = providerRepository.findByName(providerRef)
                                .orElseThrow(() -> new RuntimeException("Provider not found: " + providerRef));
                    }

                    // Create Claim Request for reuse
                    BacklogClaimRequest request = BacklogClaimRequest.builder()
                            .memberId(member.getId())
                            .providerId(provider.getId())
                            .serviceDate(serviceDate != null ? serviceDate : LocalDate.now())
                            .doctorName(doctorName)
                            .diagnosis(diagnosis)
                            .legacyReferenceNumber(legacyRef)
                            .networkStatus(NetworkType.IN_NETWORK)
                            .lines(List.of(BacklogServiceLineDto.builder()
                                    .serviceCode(serviceCode)
                                    .quantity(quantity)
                                    .grossAmount(gross)
                                    .coveredAmount(approved)
                                    .build()))
                            .build();

                    createBacklogClaim(request, enteredBy, ClaimSource.EXCEL_BACKLOG);
                    successCount++;
                } catch (Exception e) {
                    failureCount++;
                    errors.add(BacklogImportResponse.ImportError.builder()
                            .rowNumber(rowIndex)
                            .errorMessage(e.getMessage())
                            .build());
                }

                // Simple batch commit optimization in Spring isn't direct here 
                // because of @Transactional at method level, but for MVP this works.
            }
        } catch (Exception e) {
            log.error("Excel import failed", e);
            errors.add(BacklogImportResponse.ImportError.builder()
                    .errorMessage("General Error: " + e.getMessage())
                    .build());
        }

        return BacklogImportResponse.builder()
                .totalProcessed(totalRows)
                .successCount(successCount)
                .failureCount(failureCount)
                .errors(errors)
                .build();
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            default -> "";
        };
    }

    private LocalDate getDateCellValue(Cell cell) {
        if (cell == null) return null;
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            return cell.getDateCellValue().toInstant().atZone(ZoneId.systemDefault()).toLocalDate();
        }
        return null;
    }

    private Integer parseInteger(Cell cell, Integer defaultValue) {
        if (cell == null) return defaultValue;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return (int) cell.getNumericCellValue();
            if (cell.getCellType() == CellType.STRING) return Integer.parseInt(cell.getStringCellValue().trim());
        } catch (Exception e) {
            log.warn("Failed to parse integer from cell, using default: {}", defaultValue);
        }
        return defaultValue;
    }

    private BigDecimal parseBigDecimal(Cell cell, BigDecimal defaultValue) {
        if (cell == null) return defaultValue;
        try {
            if (cell.getCellType() == CellType.NUMERIC) return BigDecimal.valueOf(cell.getNumericCellValue());
            if (cell.getCellType() == CellType.STRING) return new BigDecimal(cell.getStringCellValue().trim());
        } catch (Exception e) {
            log.warn("Failed to parse BigDecimal from cell, using default: {}", defaultValue);
        }
        return defaultValue;
    }
}
