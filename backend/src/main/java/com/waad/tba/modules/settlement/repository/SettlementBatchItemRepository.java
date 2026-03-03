package com.waad.tba.modules.settlement.repository;

import com.waad.tba.modules.settlement.entity.SettlementBatchItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

/**
 * Repository for Settlement Batch Items
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                  SETTLEMENT BATCH ITEM REPOSITORY                             ║
 * ║───────────────────────────────────────────────────────────────────────────────║
 * ║ Links claims to settlement batches.                                           ║
 * ║ Each claim can only be in ONE batch (enforced by unique constraint).          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */
@Repository
public interface SettlementBatchItemRepository extends JpaRepository<SettlementBatchItem, Long> {

    // ═══════════════════════════════════════════════════════════════════════════
    // BASIC QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Find all items for a batch
     */
    List<SettlementBatchItem> findBySettlementBatchId(Long settlementBatchId);

    /**
     * Find item by claim ID
     * Since claim_id is unique, this returns at most one item
     */
    Optional<SettlementBatchItem> findByClaimId(Long claimId);

    /**
     * Check if claim is already in a batch
     */
    boolean existsByClaimId(Long claimId);

    /**
     * Find items by multiple claim IDs
     */
    @Query("SELECT sbi FROM SettlementBatchItem sbi WHERE sbi.claimId IN :claimIds")
    List<SettlementBatchItem> findByClaimIds(@Param("claimIds") List<Long> claimIds);

    // ═══════════════════════════════════════════════════════════════════════════
    // AGGREGATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Count items in a batch
     */
    long countBySettlementBatchId(Long settlementBatchId);

    /**
     * Get total net amount for a batch
     */
    @Query("SELECT COALESCE(SUM(sbi.netAmountSnapshot), 0) FROM SettlementBatchItem sbi " +
           "WHERE sbi.settlementBatchId = :batchId")
    BigDecimal getTotalNetAmountByBatch(@Param("batchId") Long batchId);

    /**
     * Get total gross amount for a batch
     */
    @Query("SELECT COALESCE(SUM(sbi.grossAmountSnapshot), 0) FROM SettlementBatchItem sbi " +
           "WHERE sbi.settlementBatchId = :batchId")
    BigDecimal getTotalGrossAmountByBatch(@Param("batchId") Long batchId);

    /**
     * Get total patient share for a batch
     */
    @Query("SELECT COALESCE(SUM(sbi.patientShareSnapshot), 0) FROM SettlementBatchItem sbi " +
           "WHERE sbi.settlementBatchId = :batchId")
    BigDecimal getTotalPatientShareByBatch(@Param("batchId") Long batchId);

    /**
     * Get batch totals: [count, grossAmount, netAmount, patientShare]
     */
    @Query("SELECT COUNT(sbi), " +
           "COALESCE(SUM(sbi.grossAmountSnapshot), 0), " +
           "COALESCE(SUM(sbi.netAmountSnapshot), 0), " +
           "COALESCE(SUM(sbi.patientShareSnapshot), 0) " +
           "FROM SettlementBatchItem sbi WHERE sbi.settlementBatchId = :batchId")
    List<Object[]> getBatchTotals(@Param("batchId") Long batchId);

    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Delete items by batch ID
     */
    @Modifying
    @Query("DELETE FROM SettlementBatchItem sbi WHERE sbi.settlementBatchId = :batchId")
    void deleteBySettlementBatchId(@Param("batchId") Long batchId);

    /**
     * Delete item by claim ID
     */
    @Modifying
    @Query("DELETE FROM SettlementBatchItem sbi WHERE sbi.claimId = :claimId")
    void deleteByClaimId(@Param("claimId") Long claimId);

    /**
     * Delete items by multiple claim IDs
     */
    @Modifying
    @Query("DELETE FROM SettlementBatchItem sbi WHERE sbi.claimId IN :claimIds")
    void deleteByClaimIds(@Param("claimIds") List<Long> claimIds);

    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION QUERIES
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Check if any claims are already in a batch
     * Returns the claim IDs that are already in batches
     */
    @Query("SELECT sbi.claimId FROM SettlementBatchItem sbi WHERE sbi.claimId IN :claimIds")
    List<Long> findClaimIdsAlreadyInBatch(@Param("claimIds") List<Long> claimIds);

    /**
     * Get batch ID for a claim (if exists)
     */
    @Query("SELECT sbi.settlementBatchId FROM SettlementBatchItem sbi WHERE sbi.claimId = :claimId")
    Optional<Long> findBatchIdByClaimId(@Param("claimId") Long claimId);
}
