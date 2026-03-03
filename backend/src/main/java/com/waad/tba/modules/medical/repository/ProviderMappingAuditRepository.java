package com.waad.tba.modules.medical.repository;

import com.waad.tba.modules.medical.entity.ProviderMappingAudit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link ProviderMappingAudit}.
 */
@Repository
public interface ProviderMappingAuditRepository extends JpaRepository<ProviderMappingAudit, Long> {

    /**
     * Retrieve the full audit trail for a single raw service, oldest first.
     */
    List<ProviderMappingAudit> findByProviderRawServiceIdOrderByPerformedAtAsc(Long rawServiceId);
}
