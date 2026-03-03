package com.waad.tba.modules.medicalpackage;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicalPackageRepository extends JpaRepository<MedicalPackage, Long> {
    
    Optional<MedicalPackage> findByCode(String code);
    
    List<MedicalPackage> findByActive(Boolean active);
    
    boolean existsByCode(String code);
    
    @Query("SELECT mp FROM MedicalPackage mp LEFT JOIN FETCH mp.services WHERE mp.id = :id")
    Optional<MedicalPackage> findByIdWithServices(Long id);
    
    @Query("SELECT mp FROM MedicalPackage mp LEFT JOIN FETCH mp.services")
    List<MedicalPackage> findAllWithServices();
    
    @Query("SELECT mp FROM MedicalPackage mp WHERE " +
           "(:search IS NULL OR :search = '' OR " +
           "LOWER(mp.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(mp.code) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<MedicalPackage> findAllWithSearch(@Param("search") String search, Pageable pageable);
    
    @Query("SELECT mp FROM MedicalPackage mp WHERE " +
           "LOWER(mp.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(mp.code) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<MedicalPackage> search(@Param("query") String query);
}
