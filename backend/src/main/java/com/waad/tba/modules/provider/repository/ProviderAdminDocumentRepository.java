package com.waad.tba.modules.provider.repository;

import com.waad.tba.modules.provider.entity.ProviderAdminDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Provider Administrative Documents
 */
@Repository
public interface ProviderAdminDocumentRepository extends JpaRepository<ProviderAdminDocument, Long> {
    
    /**
     * Find all documents for a provider
     */
    List<ProviderAdminDocument> findByProviderId(Long providerId);
    
    /**
     * Find documents by provider and type
     */
    List<ProviderAdminDocument> findByProviderIdAndType(Long providerId, String type);
    
    /**
     * Check if document exists for provider
     */
    boolean existsByProviderIdAndId(Long providerId, Long id);

    /**
     * Delete all admin documents for a provider without loading entities.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = "DELETE FROM provider_admin_documents WHERE provider_id = :providerId", nativeQuery = true)
    int deleteAllByProviderIdNative(@Param("providerId") Long providerId);
}
