package com.waad.tba.modules.medical.repository;

import com.waad.tba.modules.medical.entity.ProviderServiceMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for {@link ProviderServiceMapping}.
 */
@Repository
public interface ProviderServiceMappingRepository extends JpaRepository<ProviderServiceMapping, Long> {

    /**
     * Find the resolved mapping for a given raw service.
     * At most one mapping per raw service (UNIQUE constraint in DB).
     */
    Optional<ProviderServiceMapping> findByProviderRawServiceId(Long rawId);

    /**
     * Find mapping for provider + medical service combination.
     */
    Optional<ProviderServiceMapping> findFirstByProviderRawServiceProviderIdAndMedicalServiceId(Long providerId, Long medicalServiceId);
}
