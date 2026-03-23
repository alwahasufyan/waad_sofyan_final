package com.waad.tba.modules.member.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberFinancialRegisterRowDto {
    private Long memberId;
    private String fullName;
    private String cardNumber;
    private String employerName;
    private BigDecimal annualLimit;
    private BigDecimal usedAmount;
    private BigDecimal remainingAmount;
}
