package com.waad.tba.modules.settlement.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "provider_payment_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderPaymentDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    @Column(name = "account_transaction_id")
    private Long accountTransactionId;

    @Column(name = "payment_year", nullable = false)
    private Integer paymentYear;

    @Column(name = "payment_month", nullable = false)
    private Integer paymentMonth;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 30)
    private DocumentType documentType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private DocumentStatus status = DocumentStatus.ACTIVE;

    @Column(name = "receipt_number", nullable = false, unique = true, length = 40)
    private String receiptNumber;

    @Column(name = "payment_reference", length = 100)
    private String paymentReference;

    @Column(name = "amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(name = "notes", length = 1000)
    private String notes;

    @Column(name = "superseded_by_id")
    private Long supersededById;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "updated_by")
    private Long updatedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (status == null) {
            status = DocumentStatus.ACTIVE;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum DocumentType {
        PAYMENT_VOUCHER,
        RECEIPT_VOUCHER
    }

    public enum DocumentStatus {
        ACTIVE,
        SUPERSEDED
    }
}
