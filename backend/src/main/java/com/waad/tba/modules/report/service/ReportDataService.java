package com.waad.tba.modules.report.service;

import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.claim.repository.ClaimRepository;
import com.waad.tba.modules.report.dto.ClaimReportDto;
import com.waad.tba.modules.report.dto.ClaimStatementItemDto;
import com.waad.tba.modules.report.dto.ClaimStatementReportDto;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportDataService {

    private final ClaimRepository claimRepository;

    @Transactional(readOnly = true)
    public ClaimReportDto getClaimReportData(List<Long> claimIds) {
        List<Claim> claims = claimRepository.findAllById(claimIds);
        
        List<ClaimStatementReportDto> groupedClaims = new ArrayList<>();
        BigDecimal grandTotalGross = BigDecimal.ZERO;
        BigDecimal grandTotalNet = BigDecimal.ZERO;
        BigDecimal grandTotalRejected = BigDecimal.ZERO;

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (Claim claim : claims) {
            String patientName = claim.getMember() != null ? claim.getMember().getFullName() : "غير معروف";
            String insuranceNumber = claim.getMember() != null && claim.getMember().getPolicyNumber() != null ? claim.getMember().getPolicyNumber() : "غير معروف";
            
            String originNumber = claim.getClaimBatch() != null ? claim.getClaimBatch().getBatchCode() : claim.getId().toString();
            String diagnosis = claim.getDiagnosisDescription() != null ? claim.getDiagnosisDescription() : claim.getDiagnosisCode();
            
            List<ClaimStatementItemDto> items = new ArrayList<>();
            BigDecimal subTotalGross = BigDecimal.ZERO;
            BigDecimal subTotalNet = BigDecimal.ZERO;
            BigDecimal subTotalRejected = BigDecimal.ZERO;
            
            for (ClaimLine line : claim.getLines()) {
                BigDecimal gross = line.getRequestedUnitPrice() != null ? 
                    line.getRequestedUnitPrice().multiply(BigDecimal.valueOf(line.getQuantity())) : line.getTotalPrice();
                    
                BigDecimal rejected = line.getRefusedAmount() != null ? line.getRefusedAmount() : BigDecimal.ZERO;
                if (Boolean.TRUE.equals(line.getRejected())) {
                    rejected = gross;
                }
                
                BigDecimal net = gross.subtract(rejected);
                if (net.compareTo(BigDecimal.ZERO) < 0) net = BigDecimal.ZERO;

                items.add(ClaimStatementItemDto.builder()
                        .medicalService(line.getServiceName())
                        .serviceDate(claim.getServiceDate())
                        .grossAmount(gross)
                        .netAmount(net)
                        .rejectedAmount(rejected)
                        .rejectionReason(line.getRejectionReason())
                        .build());
                        
                subTotalGross = subTotalGross.add(gross);
                subTotalNet = subTotalNet.add(net);
                subTotalRejected = subTotalRejected.add(rejected);
            }
            
            groupedClaims.add(ClaimStatementReportDto.builder()
                    .patientName(patientName)
                    .insuranceNumber(insuranceNumber)
                    .originNumber("CLM-" + originNumber)
                    .diagnosis(diagnosis)
                    .currentContract(claim.getProviderName())
                    .items(items)
                    .subTotalGross(subTotalGross)
                    .subTotalNet(subTotalNet)
                    .subTotalRejected(subTotalRejected)
                    .build());
                    
            grandTotalGross = grandTotalGross.add(subTotalGross);
            grandTotalNet = grandTotalNet.add(subTotalNet);
            grandTotalRejected = grandTotalRejected.add(subTotalRejected);
        }

        return ClaimReportDto.builder()
                .reportDate(LocalDate.now().format(dateFormatter))
                .companyName("TBA Waad - شركة الوعد")
                .companyLogoBase64("") // Assuming logo is handled by CSS or static img
                .groupedClaims(groupedClaims)
                .grandTotalGross(grandTotalGross)
                .grandTotalNet(grandTotalNet)
                .grandTotalRejected(grandTotalRejected)
                .build();
    }
}
