package com.waad.tba.modules.employer.repository;

import com.waad.tba.modules.employer.entity.Employer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * LEGACY REPOSITORY - READ ONLY
 * 
 * @deprecated Use {@link com.waad.tba.common.repository.OrganizationRepository} instead.
 *             This repository is kept for backward compatibility ONLY.
 *             DO NOT use save(), saveAll(), delete(), or any write operations.
 *             All writes must go through OrganizationRepository with type=EMPLOYER.
 */
@Deprecated
public interface EmployerRepository extends JpaRepository<Employer, Long> {

    List<Employer> findByActiveTrue();
    
    Optional<Employer> findByCode(String code);
    
    /**
     * Find employer by name (case-insensitive exact match)
     */
    Optional<Employer> findByNameIgnoreCase(String name);

    /**
     * Find the default employer
     */
    Optional<Employer> findByIsDefaultTrue();
}
