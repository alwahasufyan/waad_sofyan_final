package com.waad.tba.modules.report.controller;

import com.waad.tba.modules.report.dto.ClaimAuditFlatDto;
import com.waad.tba.modules.report.dto.ClaimReportDto;
import com.waad.tba.modules.report.dto.ClaimStatementItemDto;
import com.waad.tba.modules.report.dto.ClaimStatementReportDto;
import com.waad.tba.modules.report.service.PdfExportService;
import com.waad.tba.modules.report.service.ReportDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportDataService reportDataService;
    private final PdfExportService pdfExportService;
    private final TemplateEngine templateEngine;
    private final com.waad.tba.services.pdf.JasperReportService jasperReportService;

    @GetMapping("/claims/html")
    public String getClaimReportHtml(@RequestParam List<Long> claimIds, Model model) {
        ClaimReportDto reportData = reportDataService.getClaimReportData(claimIds);
        model.addAttribute("report", reportData);
        return "reports/claim-report"; // Renders claim-report.html Thymeleaf template
    }

    @GetMapping("/claims/pdf")
    @ResponseBody
    public ResponseEntity<byte[]> getClaimReportPdf(@RequestParam List<Long> claimIds) {
        try {
            ClaimReportDto reportData = reportDataService.getClaimReportData(claimIds);
            
            Context context = new Context();
            context.setVariable("report", reportData);
            
            String htmlString = templateEngine.process("reports/claim-report", context);
            
            byte[] pdfBytes = pdfExportService.generatePdfFromHtml(htmlString);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("filename", "claim_statement.pdf");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/claims/jasper")
    @ResponseBody
    public ResponseEntity<byte[]> getClaimReportJasper(@RequestParam List<Long> claimIds) {
        try {
            ClaimReportDto reportData = reportDataService.getClaimReportData(claimIds);

            java.util.Map<String, Object> params = new java.util.HashMap<>();
            params.put("COMPANY_NAME", reportData.getCompanyName());
            params.put("REPORT_DATE", reportData.getReportDate());
            params.put("REPORT_NUMBER", reportData.getBatchCode() != null ? reportData.getBatchCode() : reportData.getReportTitle());
            params.put("PROVIDER_NAME", reportData.getProviderName());
            params.put("TOTAL_GROSS", reportData.getGrandTotalGross());
            params.put("TOTAL_NET", reportData.getGrandTotalNet());
            params.put("TOTAL_REJECTED", reportData.getGrandTotalRejected());
            params.put("CLAIM_COUNT", reportData.getClaimCount());

            params.put("INTRO_TEXT", reportData.getIntroText());
            params.put("FOOTER_NOTE", reportData.getFooterNote());
            params.put("SIG_RIGHT_TOP", reportData.getSigRightTop());
            params.put("SIG_RIGHT_BOTTOM", reportData.getSigRightBottom());
            params.put("SIG_LEFT_TOP", reportData.getSigLeftTop());
            params.put("SIG_LEFT_BOTTOM", reportData.getSigLeftBottom());
            params.put("PRIMARY_COLOR", reportData.getPrimaryColor());

            // Handle Logo Base64 string and convert to InputStream for Jasper
            if (reportData.getCompanyLogoBase64() != null && !reportData.getCompanyLogoBase64().isEmpty()) {
                try {
                    String base64 = reportData.getCompanyLogoBase64();
                    // Strip the prefix if present (e.g., data:image/png;base64,)
                    if (base64.contains(",")) {
                        base64 = base64.split(",")[1];
                    }
                    byte[] logoBytes = java.util.Base64.getDecoder().decode(base64);
                    params.put("COMPANY_LOGO", new java.io.ByteArrayInputStream(logoBytes));
                } catch (Exception e) {
                    // Log error but continue without logo if decoding fails
                    System.err.println("Failed to decode company logo for Jasper: " + e.getMessage());
                }
            }

            // Flatten grouped claims into row-level beans expected by the Jasper template
            List<ClaimAuditFlatDto> flatRows = flattenClaims(reportData.getGroupedClaims());

            // Generate PDF using Jasper
            byte[] pdfBytes = jasperReportService.generatePdf("reports/claim-audit-report.jrxml", params, flatRows);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("filename", "claim_audit_jasper.pdf");

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Jasper template expects flat rows with claim + line info.
     */
    private List<ClaimAuditFlatDto> flattenClaims(List<ClaimStatementReportDto> groupedClaims) {
        if (groupedClaims == null) return java.util.List.of();

        return groupedClaims.stream()
                .flatMap(claim -> {
                    AtomicInteger idx = new AtomicInteger(1);
                    List<ClaimStatementItemDto> items = claim.getItems() != null ? claim.getItems() : java.util.List.of();
                    return items.stream().map(item -> ClaimAuditFlatDto.builder()
                            .claimId(claim.getClaimId())
                            .claimNo(String.valueOf(claim.getClaimId()))
                            .originNo(String.valueOf(claim.getClaimId()))
                            .insuranceNumber(claim.getInsuranceNumber())
                            .patientName(claim.getPatientName())
                            .complaint("") // غير متوفر حالياً
                            .diagnosis(claim.getDiagnosis())
                            .serviceDate(item.getServiceDate() != null ? java.sql.Date.valueOf(item.getServiceDate()) : null)
                            .medicalService(item.getMedicalService())
                            .grossAmount(defaultZero(item.getGrossAmount()))
                            .netAmount(defaultZero(item.getNetAmount()))
                            .rejectedAmount(defaultZero(item.getRejectedAmount()))
                            .rejectionReason(item.getRejectionReasonArabic() != null ? item.getRejectionReasonArabic() : item.getRejectionReason())
                            .lineNo(idx.getAndIncrement())
                            .build());
                })
                .collect(Collectors.toList());
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
