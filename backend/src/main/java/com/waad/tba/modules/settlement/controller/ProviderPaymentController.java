package com.waad.tba.modules.settlement.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.time.LocalDate;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.settlement.api.request.CreateProviderPaymentRequest;
import com.waad.tba.modules.settlement.api.request.CreateMonthlyPaymentDocumentRequest;
import com.waad.tba.modules.settlement.api.request.UpdateMonthlyPaymentDocumentRequest;
import com.waad.tba.modules.settlement.api.request.UnlockMonthlyClosureRequest;
import com.waad.tba.modules.settlement.dto.AccountSummaryDTO;
import com.waad.tba.modules.settlement.dto.ProviderMonthlySummaryDTO;
import com.waad.tba.modules.settlement.dto.ProviderPaymentDocumentDTO;
import com.waad.tba.modules.settlement.dto.ProviderAccountListDTO;
import com.waad.tba.modules.settlement.entity.AccountTransaction;
import com.waad.tba.modules.settlement.service.ProviderAccountService;
import com.waad.tba.modules.settlement.service.ProviderMonthlySettlementService;
import com.waad.tba.modules.settlement.service.ProviderMonthlyPaymentService;
import com.waad.tba.security.AuthorizationService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Settlement - Provider Payments (v1)", description = "Compatibility and payment endpoints for provider settlement flows")
@PreAuthorize("isAuthenticated()")
public class ProviderPaymentController {

    private final ProviderAccountService providerAccountService;
    private final ProviderMonthlySettlementService providerMonthlySettlementService;
    private final ProviderMonthlyPaymentService providerMonthlyPaymentService;
    private final AuthorizationService authorizationService;

    @GetMapping("/provider-payments")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
    @Operation(summary = "List provider payment accounts", description = "Compatibility endpoint that returns provider accounts for payment screens")
    public ResponseEntity<ApiResponse<List<ProviderAccountListDTO>>> listProviderPaymentAccounts(
            @Parameter(description = "Return only providers with outstanding balance") @RequestParam(name = "hasBalance", required = false, defaultValue = "false") boolean hasBalance) {

        List<ProviderAccountListDTO> accounts = providerAccountService.getAccountsWithProviderNames(hasBalance);
        return ResponseEntity.ok(ApiResponse.success(accounts));
    }

    @GetMapping("/provider-payments/hasBalance")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
    @Operation(summary = "List providers with outstanding balance", description = "Legacy compatibility endpoint used by older frontend builds")
    public ResponseEntity<ApiResponse<List<ProviderAccountListDTO>>> listProviderPaymentAccountsWithBalance() {

        List<ProviderAccountListDTO> accounts = providerAccountService.getAccountsWithProviderNames(true);
        return ResponseEntity.ok(ApiResponse.success(accounts));
    }

    @GetMapping("/provider-payments/{providerId}/monthly-summary")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
    @Operation(summary = "Get provider monthly summary", description = "Returns 12-month approved/paid/remaining summary for a provider")
    public ResponseEntity<ApiResponse<List<ProviderMonthlySummaryDTO>>> getProviderMonthlySummary(
            @Parameter(description = "Provider ID", required = true) @PathVariable("providerId") Long providerId,
            @Parameter(description = "Calendar year, defaults to current year") @RequestParam(name = "year", required = false) Integer year) {

        int targetYear = year != null ? year : LocalDate.now().getYear();
        List<ProviderMonthlySummaryDTO> summary = providerMonthlySettlementService.getYearlySummary(providerId,
                targetYear);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

        @GetMapping("/provider-payments/{providerId}/monthly-payments")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
        @Operation(summary = "List provider monthly payment documents", description = "Returns monthly payment/receipt vouchers for a provider")
        public ResponseEntity<ApiResponse<List<ProviderPaymentDocumentDTO>>> listMonthlyPayments(
            @PathVariable("providerId") Long providerId,
            @RequestParam(name = "year") Integer year,
            @RequestParam(name = "month") Integer month) {

        List<ProviderPaymentDocumentDTO> rows = providerMonthlyPaymentService.listMonthlyPayments(providerId, year, month);
        return ResponseEntity.ok(ApiResponse.success(rows));
        }

        @PostMapping("/provider-payments/{providerId}/monthly-payments")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT')")
        @Operation(summary = "Create monthly payment document", description = "Creates PAY/RCV monthly voucher and posts financial entry")
        public ResponseEntity<ApiResponse<ProviderPaymentDocumentDTO>> createMonthlyPayment(
            @PathVariable("providerId") Long providerId,
            @Valid @RequestBody CreateMonthlyPaymentDocumentRequest request) {

        Long userId = authorizationService.getCurrentUser() != null ? authorizationService.getCurrentUser().getId()
            : null;
        ProviderPaymentDocumentDTO created = providerMonthlyPaymentService.createMonthlyPayment(providerId, request, userId);
        return ResponseEntity.ok(ApiResponse.success("تم إنشاء سند شهري بنجاح", created));
        }

        @PostMapping("/provider-payments/{providerId}/monthly-payments/{paymentId}/update")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT')")
        @Operation(summary = "Update monthly payment document", description = "Performs accounting-safe update via reversal + repost")
        public ResponseEntity<ApiResponse<ProviderPaymentDocumentDTO>> updateMonthlyPayment(
            @PathVariable("providerId") Long providerId,
            @PathVariable("paymentId") Long paymentId,
            @Valid @RequestBody UpdateMonthlyPaymentDocumentRequest request) {

        Long userId = authorizationService.getCurrentUser() != null ? authorizationService.getCurrentUser().getId()
            : null;
        ProviderPaymentDocumentDTO updated = providerMonthlyPaymentService.updateMonthlyPayment(providerId, paymentId,
            request, userId);
        return ResponseEntity.ok(ApiResponse.success("تم تعديل السند مع قيد تصحيح محاسبي", updated));
        }

        @PostMapping("/provider-payments/{providerId}/months/{year}/{month}/lock")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT')")
        @Operation(summary = "Lock provider month", description = "Locks month after full settlement and prevents payment edits")
        public ResponseEntity<ApiResponse<Map<String, Object>>> lockMonth(
            @PathVariable("providerId") Long providerId,
            @PathVariable("year") Integer year,
            @PathVariable("month") Integer month) {

        Long userId = authorizationService.getCurrentUser() != null ? authorizationService.getCurrentUser().getId()
            : null;
        providerMonthlyPaymentService.lockMonth(providerId, year, month, userId);

        Map<String, Object> payload = Map.of(
            "providerId", providerId,
            "year", year,
            "month", month,
            "status", "LOCKED");
        return ResponseEntity.ok(ApiResponse.success("تم قفل الشهر بنجاح", payload));
        }

        @PostMapping("/provider-payments/{providerId}/months/{year}/{month}/unlock")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT')")
        @Operation(summary = "Unlock provider month", description = "Unlocks month for corrections with mandatory reason")
        public ResponseEntity<ApiResponse<Map<String, Object>>> unlockMonth(
            @PathVariable("providerId") Long providerId,
            @PathVariable("year") Integer year,
            @PathVariable("month") Integer month,
            @Valid @RequestBody UnlockMonthlyClosureRequest request) {

        Long userId = authorizationService.getCurrentUser() != null ? authorizationService.getCurrentUser().getId()
            : null;
        providerMonthlyPaymentService.unlockMonth(providerId, year, month, request.getReason(), userId);

        Map<String, Object> payload = Map.of(
            "providerId", providerId,
            "year", year,
            "month", month,
            "status", "OPEN",
            "reason", request.getReason());
        return ResponseEntity.ok(ApiResponse.success("تم فك قفل الشهر بنجاح", payload));
        }

        @GetMapping("/provider-payments/{providerId}/monthly-payments/{paymentId}/preview")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
        @Operation(summary = "Preview payment receipt", description = "Returns printable preview data for PAY/RCV receipt")
        public ResponseEntity<ApiResponse<Map<String, Object>>> previewPaymentReceipt(
            @PathVariable("providerId") Long providerId,
            @PathVariable("paymentId") Long paymentId) {

        Map<String, Object> payload = providerMonthlyPaymentService.getPaymentPreview(providerId, paymentId);
        return ResponseEntity.ok(ApiResponse.success(payload));
        }

        @GetMapping("/provider-payments/{providerId}/monthly-statement")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
        @Operation(summary = "Preview monthly statement", description = "Returns printable monthly statement data for provider")
        public ResponseEntity<ApiResponse<Map<String, Object>>> previewMonthlyStatement(
            @PathVariable("providerId") Long providerId,
            @RequestParam(name = "year") Integer year,
            @RequestParam(name = "month") Integer month) {

        Map<String, Object> payload = providerMonthlyPaymentService.getMonthlyStatement(providerId, year, month);
        return ResponseEntity.ok(ApiResponse.success(payload));
        }

        @GetMapping("/provider-payments/{providerId}/yearly-statement")
        @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT', 'FINANCE_VIEWER')")
        @Operation(summary = "Preview yearly statement", description = "Returns printable yearly statement data for provider")
        public ResponseEntity<ApiResponse<Map<String, Object>>> previewYearlyStatement(
            @PathVariable("providerId") Long providerId,
            @RequestParam(name = "year", required = false) Integer year) {

        int targetYear = year != null ? year : LocalDate.now().getYear();
        Map<String, Object> payload = providerMonthlyPaymentService.getYearlyStatement(providerId, targetYear);
        return ResponseEntity.ok(ApiResponse.success(payload));
        }

    @PostMapping("/settlements/payments/provider/{providerId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ACCOUNTANT')")
    @Operation(summary = "Record provider installment payment", description = "Creates a debit transaction against provider account balance for a manual or installment payment")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createProviderInstallment(
            @Parameter(description = "Provider ID", required = true) @PathVariable("providerId") Long providerId,
            @Valid @RequestBody CreateProviderPaymentRequest request) {

        Long userId = authorizationService.getCurrentUser() != null ? authorizationService.getCurrentUser().getId()
                : null;

        String description = buildPaymentDescription(request);

        log.info("Recording provider installment payment. providerId={}, amount={}, reference={}",
                providerId, request.getAmount(), request.getPaymentReference());

        AccountTransaction transaction = providerAccountService.debitOnInstallmentPayment(
                providerId,
                request.getAmount(),
                description,
                userId);

        AccountSummaryDTO summary = providerAccountService.getAccountSummary(providerId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("providerId", providerId);
        result.put("transactionId", transaction.getId());
        result.put("amount", transaction.getAmount());
        result.put("paymentReference", request.getPaymentReference());
        result.put("paymentMethod", normalizePaymentMethod(request.getPaymentMethod()));
        result.put("referenceType", transaction.getReferenceType());
        result.put("newRunningBalance", summary.getRunningBalance());
        result.put("totalPaid", summary.getTotalPaid());
        result.put("message", "تم تسجيل دفعة مقدم الخدمة بنجاح");

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private String buildPaymentDescription(CreateProviderPaymentRequest request) {
        StringBuilder builder = new StringBuilder();
        builder.append("دفعة مقدم خدمة");
        builder.append(" | المرجع: ").append(request.getPaymentReference().trim());
        builder.append(" | الطريقة: ").append(normalizePaymentMethod(request.getPaymentMethod()));

        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            builder.append(" | ملاحظات: ").append(request.getNotes().trim());
        }

        return builder.toString();
    }

    private String normalizePaymentMethod(String paymentMethod) {
        if (paymentMethod == null || paymentMethod.isBlank()) {
            return "BANK_TRANSFER";
        }
        return paymentMethod.trim();
    }
}