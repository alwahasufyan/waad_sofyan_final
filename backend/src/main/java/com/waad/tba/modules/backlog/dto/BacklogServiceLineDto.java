package com.waad.tba.modules.backlog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacklogServiceLineDto {
    private String serviceCode;
    private String serviceName; // Optional, if code not found
    private Integer quantity;
    private BigDecimal grossAmount; // Requested amount per unit
    private BigDecimal coveredAmount; // Approved amount per unit
    private BigDecimal netAmount; // What we actually pay (after co-pay/deductible)
    private Integer coveragePercent;
    private Integer timesLimit;
    private BigDecimal amountLimit;
}
