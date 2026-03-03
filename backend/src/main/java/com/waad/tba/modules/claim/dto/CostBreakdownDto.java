package com.waad.tba.modules.claim.dto;

import java.math.BigDecimal;

import com.waad.tba.common.enums.NetworkType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for Financial Snapshot / Cost Breakdown.
 * 
 * This is the "Adjudication Summary" showing:
 * - RequestedAmount (ما يطلبه المستشفى)
 * - PatientCoPay (نسبة التحمل المحسوبة آلياً)
 * - NetProviderAmount (المبلغ الصافي للمستشفى)
 * 
 * Business Rule: 
 * RequestedAmount = PatientCoPay + NetProviderAmount
 * (إذا لم تتحقق هذه المعادلة، لا يمكن اعتماد المطالبة)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CostBreakdownDto {
    
    // ========== المبالغ الرئيسية (Primary Amounts) ==========
    
    /**
     * المبلغ المطلوب من مقدم الخدمة
     * Requested Amount (Provider's Invoice)
     */
    private BigDecimal requestedAmount;
    
    /**
     * نسبة تحمل المريض (مجموع الخصومات + Co-Pay)
     * Total Patient Responsibility
     */
    private BigDecimal patientCoPay;
    
    /**
     * المبلغ الصافي المستحق لمقدم الخدمة
     * Net Amount Payable to Provider
     */
    private BigDecimal netProviderAmount;
    
    // ========== تفاصيل الحسابات (Calculation Details) ==========
    
    /**
     * الخصم السنوي (Deductible)
     */
    private BigDecimal annualDeductible;
    
    /**
     * الخصم المُستهلك هذا العام
     */
    private BigDecimal deductibleMetYTD;
    
    /**
     * الخصم المُطبق على هذه المطالبة
     */
    private BigDecimal deductibleApplied;
    
    /**
     * نسبة المشاركة في التكلفة (%)
     */
    private BigDecimal coPayPercent;
    
    /**
     * مبلغ المشاركة في التكلفة
     */
    private BigDecimal coPayAmount;
    
    /**
     * الحد الأقصى للمصاريف من الجيب
     */
    private BigDecimal outOfPocketMax;
    
    /**
     * المصاريف من الجيب حتى الآن
     */
    private BigDecimal outOfPocketYTD;
    
    // ========== معلومات إضافية (Additional Info) ==========
    
    /**
     * نوع الشبكة (داخل/خارج الشبكة)
     */
    private NetworkType networkType;
    
    /**
     * هل تم استيفاء الخصم السنوي؟
     */
    private Boolean deductibleMet;
    
    /**
     * هل تم بلوغ الحد الأقصى للمصاريف من الجيب؟
     */
    private Boolean outOfPocketMaxReached;
    
    /**
     * هل الحسابات صحيحة (المعادلة متوازنة)؟
     */
    private Boolean calculationsValid;
    
    /**
     * رسالة التحقق
     */
    private String validationMessage;
    
    // ========== Factory Methods ==========
    
    /**
     * Create from CostCalculationService.CostBreakdown
     */
    public static CostBreakdownDto from(
            com.waad.tba.modules.claim.service.CostCalculationService.CostBreakdown breakdown) {
        
        BigDecimal patientTotal = breakdown.patientResponsibility();
        BigDecimal insuranceTotal = breakdown.insuranceAmount();
        BigDecimal requested = breakdown.requestedAmount();
        
        // Validate: requested = patient + insurance
        boolean isValid = requested.compareTo(patientTotal.add(insuranceTotal)) == 0;
        
        return CostBreakdownDto.builder()
                .requestedAmount(requested)
                .patientCoPay(patientTotal)
                .netProviderAmount(insuranceTotal)
                .annualDeductible(breakdown.annualDeductible())
                .deductibleMetYTD(breakdown.deductibleMetYTD())
                .deductibleApplied(breakdown.deductibleApplied())
                .coPayPercent(breakdown.coPayPercent())
                .coPayAmount(breakdown.coPayAmount())
                .outOfPocketMax(breakdown.outOfPocketMax())
                .outOfPocketYTD(breakdown.outOfPocketYTD())
                .networkType(breakdown.networkType())
                .deductibleMet(breakdown.isDeductibleMet())
                .outOfPocketMaxReached(breakdown.isOutOfPocketMaxReached())
                .calculationsValid(isValid)
                .validationMessage(isValid ? 
                        "الحسابات صحيحة ✓" : 
                        "خطأ: مجموع التحمل والمستحق لا يساوي المطلوب!")
                .build();
    }
    
    /**
     * Get summary text for display
     */
    public String getSummary() {
        return String.format(
            "المطلوب: %.2f | تحمل المريض: %.2f | المستحق للمستشفى: %.2f",
            requestedAmount, patientCoPay, netProviderAmount
        );
    }
    
    /**
     * Get Arabic summary
     */
    public String getSummaryArabic() {
        return String.format(
            "💰 المطلوب: %.2f د.ل\n" +
            "👤 تحمل المريض: %.2f د.ل (%.0f%%)\n" +
            "🏥 المستحق للمستشفى: %.2f د.ل",
            requestedAmount, 
            patientCoPay, 
            coPayPercent != null ? coPayPercent : BigDecimal.ZERO,
            netProviderAmount
        );
    }
}
