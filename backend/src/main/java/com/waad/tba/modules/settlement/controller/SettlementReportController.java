package com.waad.tba.modules.settlement.controller;

import com.waad.tba.modules.pdf.entity.PdfCompanySettings;
import com.waad.tba.modules.pdf.service.PdfCompanySettingsService;
import com.waad.tba.modules.settlement.dto.BatchItemDetailsDTO;
import com.waad.tba.modules.settlement.dto.BatchSummaryDTO;
import com.waad.tba.modules.settlement.report.SettlementReportRow;
import com.waad.tba.modules.settlement.service.SettlementBatchService;
import com.waad.tba.services.pdf.JasperReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * JasperReports endpoint for official settlement financial report.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/settlement/reports")
@RequiredArgsConstructor
public class SettlementReportController {

    private final SettlementBatchService settlementBatchService;
    private final JasperReportService jasperReportService;
    private final PdfCompanySettingsService pdfCompanySettingsService;

    @GetMapping("/{batchId}/official-pdf")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','FINANCE_MANAGER','FINANCE_OFFICER')")
    public ResponseEntity<byte[]> generateOfficialSettlementReport(@PathVariable Long batchId) {
        log.info("[SettlementReportController] Generating official settlement report for batchId={}", batchId);

        BatchSummaryDTO summary = settlementBatchService.getBatchSummary(batchId);
        List<BatchItemDetailsDTO> items = settlementBatchService.getBatchItemDetails(batchId);

        List<SettlementReportRow> rows = items.stream()
                .map(item -> {
                    BigDecimal approved = item.getApprovedAmount() != null ? item.getApprovedAmount() : BigDecimal.ZERO;
                    return SettlementReportRow.builder()
                            .claimNumber(item.getClaimNumber())
                            .memberName(item.getMemberName())
                            .memberNationalNumber("-")
                            .serviceDate(item.getServiceDate())
                            .diagnosisDescription("-")
                            .requestedAmount(approved)
                            .patientShare(BigDecimal.ZERO)
                            .rejectedAmount(BigDecimal.ZERO)
                            .approvedAmount(approved)
                            .build();
                })
                .toList();

        PdfCompanySettings settings = pdfCompanySettingsService.getActiveSettings();

        Map<String, Object> params = new HashMap<>();
        params.put("BATCH_NUMBER", summary.getBatchNumber());
        params.put("PROVIDER_NAME", summary.getProviderName());
        params.put("SETTLEMENT_DATE", summary.getCreatedAt() != null
                ? summary.getCreatedAt().toLocalDate().format(DateTimeFormatter.ISO_LOCAL_DATE)
                : "-");
        params.put("STATUS_AR", summary.getStatusArabic() != null ? summary.getStatusArabic() : summary.getStatus());
        params.put("TOTAL_GROSS",
                summary.getTotalGrossAmount() != null ? summary.getTotalGrossAmount() : BigDecimal.ZERO);
        params.put("TOTAL_NET", summary.getTotalNetAmount() != null ? summary.getTotalNetAmount() : BigDecimal.ZERO);
        params.put("TOTAL_PATIENT_SHARE",
                summary.getTotalPatientShare() != null ? summary.getTotalPatientShare() : BigDecimal.ZERO);
        params.put("TOTAL_REJECTED", BigDecimal.ZERO);
        params.put("COMPANY_NAME", settings != null && settings.getCompanyName() != null ? settings.getCompanyName()
                : "شركة وعد لإدارة النفقات الطبية");

        byte[] pdfBytes = jasperReportService.generatePdf("reports/settlement-report.jrxml", params, rows);

        String filename = "settlement-" + (summary.getBatchNumber() != null ? summary.getBatchNumber() : batchId)
                + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(pdfBytes.length);

        return ResponseEntity.ok().headers(headers).body(pdfBytes);
    }
}
