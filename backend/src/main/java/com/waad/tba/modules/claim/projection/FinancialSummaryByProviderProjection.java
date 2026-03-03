package com.waad.tba.modules.claim.projection;

import java.math.BigDecimal;

/**
 * Projection interface for financial summary by provider query.
 * Type-safe alternative to Object[] mapping.
 */
public interface FinancialSummaryByProviderProjection {
    
    /**
     * Provider ID
     */
    Long getProviderId();
    
    /**
     * Provider name
     */
    String getProviderName();
    
    /**
     * Total claims count
     */
    Long getClaimsCount();
    
    /**
     * Total requested amount
     */
    BigDecimal getRequestedAmount();
    
    /**
     * Total approved amount
     */
    BigDecimal getApprovedAmount();
    
    /**
     * Total patient co-pay
     */
    BigDecimal getPatientCoPay();
    
    /**
     * Net amount payable to provider
     */
    BigDecimal getNetProviderAmount();
}
