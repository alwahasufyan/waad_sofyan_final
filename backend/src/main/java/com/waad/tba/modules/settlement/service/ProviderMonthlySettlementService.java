package com.waad.tba.modules.settlement.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.waad.tba.common.exception.ResourceNotFoundException;
import com.waad.tba.modules.provider.repository.ProviderRepository;
import com.waad.tba.modules.settlement.dto.ProviderMonthlySummaryDTO;
import com.waad.tba.modules.settlement.entity.ProviderMonthlyClosure;
import com.waad.tba.modules.settlement.entity.ProviderAccount;
import com.waad.tba.modules.settlement.repository.AccountTransactionRepository;
import com.waad.tba.modules.settlement.repository.ProviderMonthlyClosureRepository;
import com.waad.tba.modules.settlement.repository.ProviderAccountRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProviderMonthlySettlementService {

    private final ProviderRepository providerRepository;
    private final ProviderAccountRepository providerAccountRepository;
    private final AccountTransactionRepository accountTransactionRepository;
    private final ProviderMonthlyClosureRepository providerMonthlyClosureRepository;

    @Transactional(readOnly = true)
    public List<ProviderMonthlySummaryDTO> getYearlySummary(Long providerId, Integer year) {
        if (!providerRepository.existsById(providerId)) {
            throw new ResourceNotFoundException("Provider", "id", providerId);
        }

        ProviderAccount account = providerAccountRepository.findByProviderId(providerId)
            .orElseThrow(() -> new ResourceNotFoundException("ProviderAccount", "providerId", providerId));

        Map<Integer, BigDecimal> approvedByMonth = toMonthAmountMap(
            accountTransactionRepository.getApprovedByMonthForYear(account.getId(), year));

        Map<Integer, BigDecimal> paidByMonth = toMonthAmountMap(
            accountTransactionRepository.getNetPaidByMonthForYear(account.getId(), year));

        Map<Integer, ProviderMonthlyClosure> closuresByMonth = providerMonthlyClosureRepository
                .findByProviderIdAndClosureYear(providerId, year)
                .stream()
                .collect(Collectors.toMap(ProviderMonthlyClosure::getClosureMonth, closure -> closure,
                        (existing, ignored) -> existing));

        List<ProviderMonthlySummaryDTO> rows = new ArrayList<>(12);
        IntStream.rangeClosed(1, 12).forEach(month -> {
            BigDecimal approvedAmount = approvedByMonth.getOrDefault(month, BigDecimal.ZERO);
            BigDecimal paidAmount = paidByMonth.getOrDefault(month, BigDecimal.ZERO);
            BigDecimal remainingAmount = approvedAmount.subtract(paidAmount);
            boolean locked = closuresByMonth.containsKey(month)
                    && closuresByMonth.get(month).getStatus() == ProviderMonthlyClosure.ClosureStatus.LOCKED;

            rows.add(ProviderMonthlySummaryDTO.builder()
                    .providerId(providerId)
                    .year(year)
                    .month(month)
                    .approvedAmount(approvedAmount)
                    .paidAmount(paidAmount)
                    .remainingAmount(remainingAmount)
                    .locked(locked)
                    .build());
        });

        log.debug("Loaded yearly monthly summary for provider {} and year {}", providerId, year);
        return rows;
    }

    private Map<Integer, BigDecimal> toMonthAmountMap(List<Object[]> rows) {
        Map<Integer, BigDecimal> map = new HashMap<>();
        if (rows == null) {
            return map;
        }

        for (Object[] row : rows) {
            if (row == null || row.length < 2) {
                continue;
            }
            Integer month = ((Number) row[0]).intValue();
            BigDecimal amount = row[1] == null ? BigDecimal.ZERO : (BigDecimal) row[1];
            map.put(month, amount);
        }

        return map;
    }
}
