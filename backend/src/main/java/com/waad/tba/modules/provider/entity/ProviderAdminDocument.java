package com.waad.tba.modules.provider.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Provider Administrative Documents Entity
 * 
 * Stores provider documents like:
 * - License (رخصة مزاولة مهنة)
 * - Commercial Register (سجل تجاري)
 * - Tax Certificate (شهادة ضريبية)
 * - Contract Copy (نسخة العقد)
 * - Other documents
 * 
 * This is separate from ProviderDocumentDto which aggregates Visit/PreAuth/Claim attachments
 */
@Entity
@Table(name = "provider_admin_documents")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ProviderAdminDocument {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Provider ID
     */
    @Column(name = "provider_id", nullable = false)
    private Long providerId;
    
    /**
     * Document type: LICENSE, COMMERCIAL_REGISTER, TAX_CERTIFICATE, CONTRACT_COPY, OTHER
     */
    @Column(name = "type", nullable = false, length = 50)
    private String type;
    
    /**
     * Original file name
     */
    @Column(name = "file_name", nullable = false)
    private String fileName;
    
    /**
     * File URL or path in storage
     */
    @Column(name = "file_url", length = 500)
    private String fileUrl;
    
    /**
     * Physical file path on server
     */
    @Column(name = "file_path", length = 500)
    private String filePath;
    
    /**
     * Document number (e.g., license number, registration number)
     */
    @Column(name = "document_number", length = 100)
    private String documentNumber;
    
    /**
     * Document expiry date (for licenses, certificates, etc.)
     */
    @Column(name = "expiry_date")
    private LocalDate expiryDate;
    
    /**
     * Additional notes
     */
    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
    /**
     * Upload timestamp
     */
    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;
    
    /**
     * Created timestamp (auto-managed by JPA)
     */
    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    /**
     * Last modified timestamp (auto-managed by JPA)
     */
    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    /**
     * Document type labels (Arabic)
     */
    public static String getTypeLabel(String type) {
        return switch (type) {
            case "LICENSE" -> "رخصة مزاولة مهنة";
            case "COMMERCIAL_REGISTER" -> "سجل تجاري";
            case "TAX_CERTIFICATE" -> "شهادة ضريبية";
            case "CONTRACT_COPY" -> "نسخة العقد";
            case "OTHER" -> "أخرى";
            default -> type;
        };
    }
}
