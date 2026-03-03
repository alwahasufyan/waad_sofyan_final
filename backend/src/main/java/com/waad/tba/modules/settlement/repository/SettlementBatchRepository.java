package com.waad.tba.modules.settlement.repository;

import com.waad.tba.modules.settlement.entity.SettlementBatch;
import com.waad.tba.modules.settlement.entity.SettlementBatch.BatchStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Settlement Batches
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                    SETTLEMENT BATCH REPOSITORY                                ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ IMPORTANT: Use findByIdForUpdate() for status transitions                     ║
 * ║ to prevent race conditions.                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
@Repository
public interface SettlementBatchRepository extends JpaRepository<SettlementBatch, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // LOCKING QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find batch by ID with pessimistic lock for status transitions
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT sb FROM SettlementBatch sb WHERE sb.id = :id")
    Optional<SettlementBatch> findByIdForUpdate(@Param("id") Long id);

    // ═══════════════════════════════════════════════════════════════════════════
    // BASIC QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find batch by batch number
     */
    Optional<SettlementBatch> findByBatchNumber(String batchNumber);

    /**
     * Check if batch number exists
     */
    boolean existsByBatchNumber(String batchNumber);

    /**
     * Find batches by provider account
     */
    List<SettlementBatch> findByProviderAccountId(Long providerAccountId);

    /**
     * Find batches by provider account with pagination
     */
    Page<SettlementBatch> findByProviderAccountId(Long providerAccountId, Pageable pageable);

    /**
     * Find batches by status
     */
    List<SettlementBatch> findByStatus(BatchStatus status);

    /**
     * Find batches by status with pagination
     */
    Page<SettlementBatch> findByStatus(BatchStatus status, Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // DATE RANGE QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find batches by settlement date range
     */
    @Query("SELECT sb FROM SettlementBatch sb WHERE sb.settlementDate BETWEEN :fromDate AND :toDate")
    List<SettlementBatch> findByDateRange(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate);

    /**
     * Find batches by settlement date range with pagination
     */
    @Query("SELECT sb FROM SettlementBatch sb WHERE sb.settlementDate BETWEEN :fromDate AND :toDate")
    Page<SettlementBatch> findByDateRange(
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);

    /**
     * Find paid batches by paidAt date range
     */
    @Query("SELECT sb FROM SettlementBatch sb WHERE sb.status = 'PAID' AND sb.paidAt BETWEEN :fromDateTime AND :toDateTime")
    List<SettlementBatch> findPaidByDateRange(
            @Param("fromDateTime") java.time.LocalDateTime fromDateTime,
            @Param("toDateTime") java.time.LocalDateTime toDateTime);

    // ═══════════════════════════════════════════════════════════════════════════
    // COMBINED FILTER QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find batches with multiple filters
     */
    @Query("SELECT sb FROM SettlementBatch sb WHERE " +
           "(:providerAccountId IS NULL OR sb.providerAccountId = :providerAccountId) " +
           "AND (:status IS NULL OR sb.status = :status) " +
           "AND (:fromDate IS NULL OR sb.settlementDate >= :fromDate) " +
           "AND (:toDate IS NULL OR sb.settlementDate <= :toDate)")
    Page<SettlementBatch> findWithFilters(
            @Param("providerAccountId") Long providerAccountId,
            @Param("status") BatchStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Pageable pageable);

    /**
     * Find batches by provider account and status
     */
    List<SettlementBatch> findByProviderAccountIdAndStatus(Long providerAccountId, BatchStatus status);

    /**
     * Find batches by provider account and status with pagination
     */
    Page<SettlementBatch> findByProviderAccountIdAndStatus(Long providerAccountId, BatchStatus status, Pageable pageable);

    // ═══════════════════════════════════════════════════════════════════════════
    // AGGREGATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Count batches by status
     */
    long countByStatus(BatchStatus status);

    /**
     * Count batches by provider account and status
     */
    long countByProviderAccountIdAndStatus(Long providerAccountId, BatchStatus status);

    /**
     * Get total paid amount for provider account
     */
    @Query("SELECT COALESCE(SUM(sb.totalNetAmount), 0) FROM SettlementBatch sb " +
           "WHERE sb.providerAccountId = :providerAccountId AND sb.status = 'PAID'")
    BigDecimal getTotalPaidByProviderAccount(@Param("providerAccountId") Long providerAccountId);

    /**
     * Get total paid amount across all accounts
     */
    @Query("SELECT COALESCE(SUM(sb.totalNetAmount), 0) FROM SettlementBatch sb WHERE sb.status = 'PAID'")
    BigDecimal getTotalPaidAmount();

    /**
     * Get total pending amount (DRAFT + CONFIRMED)
     */
    @Query("SELECT COALESCE(SUM(sb.totalNetAmount), 0) FROM SettlementBatch sb WHERE sb.status IN ('DRAFT', 'CONFIRMED')")
    BigDecimal getTotalPendingAmount();

    @Query("SELECT COALESCE(SUM(sb.totalNetAmount), 0) FROM SettlementBatch sb " +
            "WHERE sb.status = 'CONFIRMED' AND NOT EXISTS (" +
            "SELECT pp.id FROM ProviderPayment pp WHERE pp.settlementBatchId = sb.id)")
    BigDecimal getOutstandingConfirmedNotPaidAmount();

    /**
     * Get batch statistics by status
     * Returns: [status, count, totalAmount]
     */
    @Query("SELECT sb.status, COUNT(sb), COALESCE(SUM(sb.totalNetAmount), 0) " +
           "FROM SettlementBatch sb GROUP BY sb.status")
    List<Object[]> getStatisticsByStatus();

    /**
     * Get batch statistics by provider account
     * Returns: [providerAccountId, count, totalAmount]
     */
    @Query("SELECT sb.providerAccountId, COUNT(sb), COALESCE(SUM(sb.totalNetAmount), 0) " +
           "FROM SettlementBatch sb WHERE sb.status = 'PAID' GROUP BY sb.providerAccountId")
    List<Object[]> getPaidStatisticsByProviderAccount();

    // ═══════════════════════════════════════════════════════════════════════════
    // BATCH NUMBER GENERATION HELPERS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Get the latest batch number for a given year
     */
        @Query("SELECT MAX(sb.batchNumber) FROM SettlementBatch sb WHERE sb.batchNumber LIKE CONCAT(:prefix, '%')")
    Optional<String> findLatestBatchNumber(@Param("prefix") String prefix);

    /**
     * Count batches created in a specific year
     */
    @Query("SELECT COUNT(sb) FROM SettlementBatch sb WHERE YEAR(sb.createdAt) = :year")
    long countByYear(@Param("year") int year);

    // ═══════════════════════════════════════════════════════════════════════════
    // USER QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find batches created by user
     */
    Page<SettlementBatch> findByCreatedBy(Long userId, Pageable pageable);

    /**
     * Find batches confirmed by user
     */
    Page<SettlementBatch> findByConfirmedBy(Long userId, Pageable pageable);

    /**
     * Find batches paid by user
     */
    Page<SettlementBatch> findByPaidBy(Long userId, Pageable pageable);
}
