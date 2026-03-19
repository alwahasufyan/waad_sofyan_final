package com.waad.tba.modules.medicaltaxonomy.controller;

import com.waad.tba.common.dto.ApiResponse;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceCreateDto;
import com.waad.tba.modules.medicaltaxonomy.dto.MedicalServiceResponseDto;
import com.waad.tba.modules.medicaltaxonomy.service.MedicalServiceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/medical-services")
@RequiredArgsConstructor
@Tag(name = "Medical Service", description = "Medical service reference data management")
@PreAuthorize("isAuthenticated()")
public class MedicalServiceController {

    private final MedicalServiceService medicalServiceService;

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create medical service", description = "Create a new medical service in the unified reference catalog")
    public ResponseEntity<ApiResponse<MedicalServiceResponseDto>> create(@Valid @RequestBody MedicalServiceCreateDto dto) {
        log.info("[MEDICAL-SERVICES] POST /api/v1/medical-services - code={}", dto.getCode());
        MedicalServiceResponseDto result = medicalServiceService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Medical service created successfully", result));
    }
}