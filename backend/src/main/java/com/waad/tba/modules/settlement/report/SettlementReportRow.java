package com.waad.tba.modules.settlement.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Data bean for a single row in the JasperReports settlement report.
 * Each field maps directly to a $F{fieldName} expression in the .jrxml.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettlementReportRow {

    /** رقم المطالبة */
    private String claimNumber;

    /** اسم المستفيد */
    private String memberName;

    /** الرقم الوطني للمستفيد */
    private String memberNationalNumber;

    /** تاريخ الخدمة */
    private LocalDate serviceDate;

    /** التشخيص */
    private String diagnosisDescription;

    /** المبلغ الإجمالي المطلوب */
    private BigDecimal requestedAmount;

    /** مساهمة المؤمن له */
    private BigDecimal patientShare;

    /** المبلغ المرفوض */
    private BigDecimal rejectedAmount;

    /** المبلغ الصافي المعتمد للصرف */
    private BigDecimal approvedAmount;
}
