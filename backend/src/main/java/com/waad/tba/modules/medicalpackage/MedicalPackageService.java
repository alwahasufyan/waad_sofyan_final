package com.waad.tba.modules.medicalpackage;

import com.waad.tba.modules.medicalpackage.dto.MedicalPackageSelectorDto;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.medicaltaxonomy.repository.MedicalServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MedicalPackageService {

    private final MedicalPackageRepository packageRepository;
    private final MedicalServiceRepository serviceRepository;

    public List<MedicalPackageSelectorDto> getSelectorOptions() {
        return packageRepository.findByActive(true).stream()
                .map(MedicalPackageMapper::toSelectorDto)
                .collect(Collectors.toList());
    }

    public Page<MedicalPackage> findAllPaginated(Pageable pageable, String search) {
        return packageRepository.findAllWithSearch(search, pageable);
    }

    public List<MedicalPackage> search(String query) {
        return packageRepository.search(query);
    }

    public List<MedicalPackage> findAll() {
        return packageRepository.findAllWithServices();
    }

    public MedicalPackage findById(Long id) {
        return packageRepository.findByIdWithServices(id)
            .orElseThrow(() -> new RuntimeException("Medical package not found with id: " + id));
    }

    public MedicalPackage findByCode(String code) {
        return packageRepository.findByCode(code)
            .orElseThrow(() -> new RuntimeException("Medical package not found with code: " + code));
    }

    public List<MedicalPackage> findActive() {
        return packageRepository.findByActive(true);
    }

    public Long count() {
        return packageRepository.count();
    }

    @Transactional
    public MedicalPackage create(MedicalPackageDTO dto) {
        if (packageRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Medical package with code " + dto.getCode() + " already exists");
        }

        MedicalPackage medicalPackage = MedicalPackage.builder()
            .code(dto.getCode())
            .name(dto.getName())
            .description(dto.getDescription())
            .totalCoverageLimit(dto.getTotalCoverageLimit())
            .active(dto.getActive() != null ? dto.getActive() : true)
            .build();

        if (dto.getServiceIds() != null && !dto.getServiceIds().isEmpty()) {
            Set<MedicalService> services = new HashSet<>();
            for (Long serviceId : dto.getServiceIds()) {
                MedicalService service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new RuntimeException("Medical service not found with id: " + serviceId));
                services.add(service);
            }
            medicalPackage.setServices(services);
        }

        return packageRepository.save(medicalPackage);
    }

    @Transactional
    public MedicalPackage update(Long id, MedicalPackageDTO dto) {
        MedicalPackage existingPackage = findById(id);

        if (!existingPackage.getCode().equals(dto.getCode()) && 
            packageRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Medical package with code " + dto.getCode() + " already exists");
        }

        existingPackage.setCode(dto.getCode());
        existingPackage.setName(dto.getName());
        existingPackage.setDescription(dto.getDescription());
        existingPackage.setTotalCoverageLimit(dto.getTotalCoverageLimit());
        existingPackage.setActive(dto.getActive() != null ? dto.getActive() : true);

        if (dto.getServiceIds() != null) {
            Set<MedicalService> services = new HashSet<>();
            for (Long serviceId : dto.getServiceIds()) {
                MedicalService service = serviceRepository.findById(serviceId)
                    .orElseThrow(() -> new RuntimeException("Medical service not found with id: " + serviceId));
                services.add(service);
            }
            existingPackage.setServices(services);
        } else {
            existingPackage.getServices().clear();
        }

        return packageRepository.save(existingPackage);
    }

    @Transactional
    public void delete(Long id) {
        MedicalPackage medicalPackage = findById(id);
        packageRepository.delete(medicalPackage);
    }
}
