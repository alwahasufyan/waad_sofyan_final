package com.waad.tba.modules.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimStatementReportDto {
    private String companyName;
    private String companyLogoBase64; // Can be empty or actual base64
    private String reportDate;
    
    // Patient Information
    private String patientName;
    private String insuranceNumber;
    private String currentContract;      // Provider Name
    private String originNumber;         // Claim File Number / Batch
    private String diagnosis;
    
    // Grouping: The list of items belonging to this claim/patient
    private List<ClaimStatementItemDto> items;
    
    private BigDecimal subTotalGross; 
    private BigDecimal subTotalNet; 
    private BigDecimal subTotalRejected; 
}
