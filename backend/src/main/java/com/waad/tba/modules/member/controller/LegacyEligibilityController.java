package com.waad.tba.modules.member.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.member.dto.EligibilityResultDto;
import com.waad.tba.modules.member.dto.MemberFinancialSummaryDto;
import com.waad.tba.modules.member.service.MemberFinancialSummaryService;
import com.waad.tba.modules.member.service.UnifiedEligibilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Backward-compatible eligibility endpoint for legacy clients/scripts.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/eligibility")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class LegacyEligibilityController {

    private final UnifiedEligibilityService eligibilityService;
    private final MemberFinancialSummaryService financialSummaryService;

    @GetMapping("/remaining-limit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'EMPLOYER_ADMIN', 'PROVIDER_STAFF')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> remainingLimit(
            @RequestParam(name = "memberIdentifier") String memberIdentifier) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("memberIdentifier", memberIdentifier);

        try {
            EligibilityResultDto eligibility = eligibilityService.checkEligibility(memberIdentifier);
            Long memberId = eligibility != null ? eligibility.getMemberId() : null;

            if (memberId != null) {
                MemberFinancialSummaryDto summary = financialSummaryService.getFinancialSummary(memberId);
                payload.put("memberId", memberId);
                payload.put("memberName", summary.getFullName());
                payload.put("annualLimit", summary.getAnnualLimit());
                payload.put("usedAmount", summary.getTotalApproved());
                payload.put("remainingLimit", summary.getRemainingCoverage());
                payload.put("usagePercentage", summary.getUtilizationPercent());
                payload.put("policyName", summary.getPolicyName());
                payload.put("policyActive", summary.getPolicyActive());
                return ResponseEntity.ok(ApiResponse.success(payload));
            }
        } catch (Exception ex) {
            log.warn("[LEGACY-ELIGIBILITY] Fallback response for identifier={}: {}", memberIdentifier, ex.getMessage());
        }

        payload.put("memberId", null);
        payload.put("annualLimit", 0);
        payload.put("usedAmount", 0);
        payload.put("remainingLimit", 0);
        payload.put("usagePercentage", 0);
        payload.put("policyName", null);
        payload.put("policyActive", false);
        return ResponseEntity.ok(ApiResponse.success(payload));
    }
}
