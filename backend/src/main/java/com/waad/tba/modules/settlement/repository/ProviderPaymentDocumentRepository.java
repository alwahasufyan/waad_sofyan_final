package com.waad.tba.modules.settlement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import com.waad.tba.modules.settlement.entity.ProviderPaymentDocument;
import com.waad.tba.modules.settlement.entity.ProviderPaymentDocument.DocumentStatus;

@Repository
public interface ProviderPaymentDocumentRepository extends JpaRepository<ProviderPaymentDocument, Long> {

    List<ProviderPaymentDocument> findByProviderIdAndPaymentYearAndPaymentMonthAndStatusOrderByPaymentDateDescIdDesc(
        Long providerId, Integer year, Integer month, DocumentStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM ProviderPaymentDocument d WHERE d.id = :id")
    Optional<ProviderPaymentDocument> findByIdForUpdate(@Param("id") Long id);

    @Query(value = """
        SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM LENGTH(:prefix) + 1) AS INTEGER)), 0)
        FROM provider_payment_documents
        WHERE receipt_number LIKE CONCAT(:prefix, '%')
        """, nativeQuery = true)
    Integer getMaxReceiptSequenceForPrefix(@Param("prefix") String prefix);

    @Query(value = """
            SELECT
                payment_month AS month_no,
                COALESCE(SUM(CASE
                    WHEN document_type = 'PAYMENT_VOUCHER' THEN amount
                    ELSE -amount
                END), 0) AS net_paid
            FROM provider_payment_documents
            WHERE provider_id = :providerId
              AND payment_year = :year
              AND status = 'ACTIVE'
            GROUP BY payment_month
            """, nativeQuery = true)
    List<Object[]> getNetPaidByMonth(@Param("providerId") Long providerId, @Param("year") Integer year);
}
