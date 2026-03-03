package com.waad.tba.modules.settlement.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.waad.tba.modules.settlement.entity.ProviderPayment;

@Repository
public interface ProviderPaymentRepository extends JpaRepository<ProviderPayment, Long> {

    boolean existsBySettlementBatchId(Long settlementBatchId);

    boolean existsByPaymentReference(String paymentReference);

    Optional<ProviderPayment> findBySettlementBatchId(Long settlementBatchId);

    List<ProviderPayment> findByProviderIdAndPaymentDateBetweenOrderByPaymentDateDesc(
            Long providerId,
            LocalDateTime fromDate,
            LocalDateTime toDate
    );

    @Query("SELECT COALESCE(SUM(pp.amount), 0) FROM ProviderPayment pp WHERE pp.providerId = :providerId")
    BigDecimal getTotalPaidByProvider(@Param("providerId") Long providerId);
}
