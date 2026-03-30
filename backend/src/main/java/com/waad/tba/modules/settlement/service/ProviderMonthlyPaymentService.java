package com.waad.tba.modules.settlement.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.BusinessRuleException;
import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.settlement.api.request.CreateMonthlyPaymentDocumentRequest;
import com.waad.tba.modules.settlement.api.request.UpdateMonthlyPaymentDocumentRequest;
import com.waad.tba.modules.settlement.dto.ProviderMonthlySummaryDTO;
import com.waad.tba.modules.settlement.dto.ProviderPaymentDocumentDTO;
import com.waad.tba.modules.settlement.entity.AccountTransaction;
import com.waad.tba.modules.settlement.entity.ProviderMonthlyClosure;
import com.waad.tba.modules.settlement.entity.ProviderPaymentDocument;
import com.waad.tba.modules.settlement.entity.ProviderPaymentDocument.DocumentStatus;
import com.waad.tba.modules.settlement.entity.ProviderPaymentDocument.DocumentType;
import com.waad.tba.modules.settlement.repository.ProviderMonthlyClosureRepository;
import com.waad.tba.modules.settlement.repository.ProviderPaymentDocumentRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProviderMonthlyPaymentService {

    private static final int RECEIPT_PAD = 6;

    private final ProviderRepository providerRepository;
    private final ProviderMonthlyClosureRepository providerMonthlyClosureRepository;
    private final ProviderPaymentDocumentRepository providerPaymentDocumentRepository;
    private final ProviderMonthlySettlementService providerMonthlySettlementService;
    private final ProviderAccountService providerAccountService;

    @Transactional
    public ProviderPaymentDocumentDTO createMonthlyPayment(Long providerId,
            CreateMonthlyPaymentDocumentRequest request,
            Long userId) {

        validateProvider(providerId);
        DocumentType documentType = parseDocumentType(request.getDocumentType());
        assertMonthOpen(providerId, request.getYear(), request.getMonth());

        // No over-payment for disbursement voucher.
        if (documentType == DocumentType.PAYMENT_VOUCHER) {
            assertMonthlyPaymentWithinRemaining(providerId, request.getYear(), request.getMonth(), request.getAmount());
        }

        AccountTransaction transaction = postFinancialEntry(providerId, request.getAmount(), documentType,
            buildCreateDescription(documentType, request), userId);

        ProviderPaymentDocument saved = saveDocumentWithUniqueReceipt(providerId, request.getYear(), request.getMonth(),
                documentType, request, transaction.getId(), userId, null);

        return toDto(saved);
    }

    @Transactional
    public ProviderPaymentDocumentDTO updateMonthlyPayment(Long providerId,
            Long paymentDocumentId,
            UpdateMonthlyPaymentDocumentRequest request,
            Long userId) {

        validateProvider(providerId);

        ProviderPaymentDocument existing = providerPaymentDocumentRepository.findByIdForUpdate(paymentDocumentId)
                .orElseThrow(() -> new ResourceNotFoundException("ProviderPaymentDocument", "id", paymentDocumentId));

        if (!Objects.equals(existing.getProviderId(), providerId)) {
            throw new ResourceNotFoundException("ProviderPaymentDocument", "id", paymentDocumentId);
        }
        if (existing.getStatus() != DocumentStatus.ACTIVE) {
            throw new BusinessRuleException("لا يمكن تعديل سند غير نشط");
        }

        assertMonthOpen(providerId, existing.getPaymentYear(), existing.getPaymentMonth());

        // Reverse old effect then post new effect for immutable accounting trail.
        postFinancialEntry(providerId, existing.getAmount(), reverseType(existing.getDocumentType()),
            "قيد تصحيح لعكس السند " + existing.getReceiptNumber(), userId);

        if (existing.getDocumentType() == DocumentType.PAYMENT_VOUCHER) {
            assertMonthlyPaymentWithinRemaining(providerId, existing.getPaymentYear(), existing.getPaymentMonth(), request.getAmount());
        }

        AccountTransaction newTransaction = postFinancialEntry(providerId, request.getAmount(), existing.getDocumentType(),
            buildUpdateDescription(existing, request), userId);

        existing.setStatus(DocumentStatus.SUPERSEDED);
        existing.setUpdatedBy(userId);
        existing.setUpdatedAt(LocalDateTime.now());
        providerPaymentDocumentRepository.save(existing);

        ProviderPaymentDocument replacement = saveDocumentWithUniqueReceipt(providerId, existing.getPaymentYear(),
                existing.getPaymentMonth(), existing.getDocumentType(),
                toCreateRequest(existing, request), newTransaction.getId(), userId, existing.getId());

        existing.setSupersededById(replacement.getId());
        providerPaymentDocumentRepository.save(existing);

        return toDto(replacement);
    }

    @Transactional
    public void lockMonth(Long providerId, Integer year, Integer month, Long userId) {
        validateProvider(providerId);

        ProviderMonthlySummaryDTO monthSummary = providerMonthlySettlementService.getYearlySummary(providerId, year)
                .stream()
                .filter(m -> Objects.equals(m.getMonth(), month))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException("تعذر تحميل ملخص الشهر"));

        if (monthSummary.getRemainingAmount().compareTo(BigDecimal.ZERO) != 0) {
            throw new BusinessRuleException("لا يمكن قفل الشهر قبل التسوية الكاملة");
        }

        ProviderMonthlyClosure closure = providerMonthlyClosureRepository.findForUpdate(providerId, year, month)
                .orElseGet(() -> ProviderMonthlyClosure.builder()
                        .providerId(providerId)
                        .closureYear(year)
                        .closureMonth(month)
                        .build());

        closure.setStatus(ProviderMonthlyClosure.ClosureStatus.LOCKED);
        closure.setLockedAt(LocalDateTime.now());
        closure.setLockedBy(userId);
        closure.setUnlockReason(null);
        providerMonthlyClosureRepository.save(closure);
    }

    @Transactional
    public void unlockMonth(Long providerId, Integer year, Integer month, String reason, Long userId) {
        validateProvider(providerId);

        ProviderMonthlyClosure closure = providerMonthlyClosureRepository.findForUpdate(providerId, year, month)
                .orElseThrow(() -> new BusinessRuleException("الشهر غير مقفل"));

        closure.setStatus(ProviderMonthlyClosure.ClosureStatus.OPEN);
        closure.setUnlockedAt(LocalDateTime.now());
        closure.setUnlockedBy(userId);
        closure.setUnlockReason(reason);
        providerMonthlyClosureRepository.save(closure);
    }

    @Transactional(readOnly = true)
    public List<ProviderPaymentDocumentDTO> listMonthlyPayments(Long providerId, Integer year, Integer month) {
        validateProvider(providerId);
        return providerPaymentDocumentRepository
                .findByProviderIdAndPaymentYearAndPaymentMonthAndStatusOrderByPaymentDateDescIdDesc(providerId, year,
                        month, DocumentStatus.ACTIVE)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPaymentPreview(Long providerId, Long paymentDocumentId) {
        validateProvider(providerId);
        Provider paymentProvider = providerRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider", "id", providerId));

        ProviderPaymentDocument document = providerPaymentDocumentRepository.findById(paymentDocumentId)
                .orElseThrow(() -> new ResourceNotFoundException("ProviderPaymentDocument", "id", paymentDocumentId));

        if (!Objects.equals(document.getProviderId(), providerId)) {
            throw new ResourceNotFoundException("ProviderPaymentDocument", "id", paymentDocumentId);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerId", providerId);
        payload.put("providerName", paymentProvider.getName());
        payload.put("providerLicense", paymentProvider.getLicenseNumber());
        payload.put("document", toDto(document));
        payload.put("printTitle", document.getDocumentType() == DocumentType.PAYMENT_VOUCHER ? "إيصال صرف" : "إيصال قبض");
        payload.put("generatedAt", LocalDateTime.now());
        return payload;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMonthlyStatement(Long providerId, Integer year, Integer month) {
        validateProvider(providerId);
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider", "id", providerId));

        List<ProviderPaymentDocumentDTO> documents = listMonthlyPayments(providerId, year, month);
        ProviderMonthlySummaryDTO summary = providerMonthlySettlementService.getYearlySummary(providerId, year)
                .stream()
                .filter(row -> Objects.equals(row.getMonth(), month))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException("تعذر تحميل ملخص الشهر"));

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerId", providerId);
        payload.put("providerName", provider.getName());
        payload.put("year", year);
        payload.put("month", month);
        payload.put("summary", summary);
        payload.put("documents", documents);
        payload.put("printTitle", "كشف شهر مقدم الخدمة");
        payload.put("generatedAt", LocalDateTime.now());
        return payload;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getYearlyStatement(Long providerId, Integer year) {
        validateProvider(providerId);
        Provider provider = providerRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("Provider", "id", providerId));

        List<ProviderMonthlySummaryDTO> monthly = providerMonthlySettlementService.getYearlySummary(providerId, year);

        BigDecimal approvedTotal = monthly.stream().map(ProviderMonthlySummaryDTO::getApprovedAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal paidTotal = monthly.stream().map(ProviderMonthlySummaryDTO::getPaidAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remainingTotal = monthly.stream().map(ProviderMonthlySummaryDTO::getRemainingAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, Object> totals = Map.of(
                "approvedTotal", approvedTotal,
                "paidTotal", paidTotal,
                "remainingTotal", remainingTotal);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("providerId", providerId);
        payload.put("providerName", provider.getName());
        payload.put("year", year);
        payload.put("months", monthly);
        payload.put("totals", totals);
        payload.put("printTitle", "الملخص السنوي لمقدم الخدمة");
        payload.put("generatedAt", LocalDateTime.now());
        return payload;
    }

    private ProviderPaymentDocument saveDocumentWithUniqueReceipt(Long providerId,
            Integer year,
            Integer month,
            DocumentType documentType,
            CreateMonthlyPaymentDocumentRequest request,
            Long transactionId,
            Long userId,
            Long supersededById) {

        int attempts = 0;
        while (attempts < 5) {
            attempts++;
            String receiptNumber = generateNextReceiptNumber(documentType, year);

            ProviderPaymentDocument document = ProviderPaymentDocument.builder()
                    .providerId(providerId)
                    .accountTransactionId(transactionId)
                    .paymentYear(year)
                    .paymentMonth(month)
                    .documentType(documentType)
                    .status(DocumentStatus.ACTIVE)
                    .receiptNumber(receiptNumber)
                    .paymentReference(trimToNull(request.getPaymentReference()))
                    .amount(request.getAmount())
                    .paymentDate(request.getPaymentDate())
                    .notes(trimToNull(request.getNotes()))
                    .supersededById(supersededById)
                    .createdBy(userId)
                    .updatedBy(userId)
                    .build();

            try {
                return providerPaymentDocumentRepository.save(document);
            } catch (DataIntegrityViolationException e) {
                log.warn("Receipt number collision, retrying receipt generation. attempt={}", attempts);
            }
        }

        throw new BusinessRuleException("تعذر توليد رقم إيصال فريد");
    }

    private AccountTransaction postFinancialEntry(Long providerId, BigDecimal amount, DocumentType type, String note,
            Long userId) {
        if (type == DocumentType.PAYMENT_VOUCHER) {
            return providerAccountService.debitOnInstallmentPayment(providerId, amount, note, userId);
        }
        return providerAccountService.creditOnReceiptCollection(providerId, amount, note, userId);
    }

    private CreateMonthlyPaymentDocumentRequest toCreateRequest(ProviderPaymentDocument existing,
            UpdateMonthlyPaymentDocumentRequest request) {
        CreateMonthlyPaymentDocumentRequest result = new CreateMonthlyPaymentDocumentRequest();
        result.setYear(existing.getPaymentYear());
        result.setMonth(existing.getPaymentMonth());
        result.setDocumentType(existing.getDocumentType().name());
        result.setAmount(request.getAmount());
        result.setPaymentDate(request.getPaymentDate());
        result.setPaymentReference(request.getPaymentReference());
        result.setNotes(request.getNotes());
        return result;
    }

    private String buildCreateDescription(DocumentType type, CreateMonthlyPaymentDocumentRequest request) {
        String base = type == DocumentType.PAYMENT_VOUCHER ? "دفعة شهرية لمقدم الخدمة" : "تحصيل من مقدم الخدمة";
        return base + " | الفترة: " + request.getMonth() + "/" + request.getYear();
    }

    private String buildUpdateDescription(ProviderPaymentDocument existing, UpdateMonthlyPaymentDocumentRequest request) {
        return "إعادة قيد بعد تعديل السند " + existing.getReceiptNumber() + " | الفترة: "
                + existing.getPaymentMonth() + "/" + existing.getPaymentYear() + " | مرجع: "
                + trimToNull(request.getPaymentReference());
    }

    private DocumentType reverseType(DocumentType type) {
        return type == DocumentType.PAYMENT_VOUCHER ? DocumentType.RECEIPT_VOUCHER : DocumentType.PAYMENT_VOUCHER;
    }

    private void assertMonthOpen(Long providerId, Integer year, Integer month) {
        ProviderMonthlyClosure closure = providerMonthlyClosureRepository
                .findByProviderIdAndClosureYearAndClosureMonth(providerId, year, month)
                .orElse(null);

        if (closure != null && closure.getStatus() == ProviderMonthlyClosure.ClosureStatus.LOCKED) {
            throw new BusinessRuleException("الشهر مقفل ولا يمكن تعديل دفعاته");
        }
    }

    private void assertMonthlyPaymentWithinRemaining(Long providerId, Integer year, Integer month, BigDecimal amount) {
        ProviderMonthlySummaryDTO monthSummary = providerMonthlySettlementService.getYearlySummary(providerId, year)
                .stream()
                .filter(m -> Objects.equals(m.getMonth(), month))
                .findFirst()
                .orElseThrow(() -> new BusinessRuleException("تعذر تحميل ملخص الشهر"));

        if (monthSummary.getRemainingAmount().compareTo(amount) < 0) {
            throw new BusinessRuleException("المبلغ أكبر من المتبقي للشهر");
        }
    }

    private ProviderPaymentDocumentDTO toDto(ProviderPaymentDocument doc) {
        return ProviderPaymentDocumentDTO.builder()
                .id(doc.getId())
                .providerId(doc.getProviderId())
                .year(doc.getPaymentYear())
                .month(doc.getPaymentMonth())
                .documentType(doc.getDocumentType().name())
                .status(doc.getStatus().name())
                .receiptNumber(doc.getReceiptNumber())
                .paymentReference(doc.getPaymentReference())
                .amount(doc.getAmount())
                .paymentDate(doc.getPaymentDate())
                .notes(doc.getNotes())
                .accountTransactionId(doc.getAccountTransactionId())
                .supersededById(doc.getSupersededById())
                .createdAt(doc.getCreatedAt())
                .updatedAt(doc.getUpdatedAt())
                .build();
    }

    private String generateNextReceiptNumber(DocumentType type, Integer year) {
        String prefix = receiptPrefix(type, year);
        Integer max = providerPaymentDocumentRepository.getMaxReceiptSequenceForPrefix(prefix);
        int next = (max == null ? 0 : max) + 1;
        return prefix + String.format(Locale.ROOT, "%0" + RECEIPT_PAD + "d", next);
    }

    private String receiptPrefix(DocumentType type, Integer year) {
        return (type == DocumentType.PAYMENT_VOUCHER ? "PAY-" : "RCV-") + year + "-";
    }

    private DocumentType parseDocumentType(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessRuleException("نوع السند مطلوب");
        }
        try {
            return DocumentType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            throw new BusinessRuleException("نوع السند غير صالح: " + value);
        }
    }

    private void validateProvider(Long providerId) {
        if (!providerRepository.existsById(providerId)) {
            throw new ResourceNotFoundException("Provider", "id", providerId);
        }
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
