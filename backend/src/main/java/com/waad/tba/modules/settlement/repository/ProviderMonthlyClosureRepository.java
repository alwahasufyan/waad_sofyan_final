package com.waad.tba.modules.settlement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import com.waad.tba.modules.settlement.entity.ProviderMonthlyClosure;

@Repository
public interface ProviderMonthlyClosureRepository extends JpaRepository<ProviderMonthlyClosure, Long> {

    List<ProviderMonthlyClosure> findByProviderIdAndClosureYear(Long providerId, Integer closureYear);

    Optional<ProviderMonthlyClosure> findByProviderIdAndClosureYearAndClosureMonth(Long providerId, Integer closureYear,
            Integer closureMonth);

        @Lock(LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT c FROM ProviderMonthlyClosure c WHERE c.providerId = :providerId AND c.closureYear = :year AND c.closureMonth = :month")
        Optional<ProviderMonthlyClosure> findForUpdate(@Param("providerId") Long providerId,
            @Param("year") Integer year,
            @Param("month") Integer month);
}
