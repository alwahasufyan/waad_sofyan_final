package com.waad.tba.modules.claim.mapper;

import com.waad.tba.modules.benefitpolicy.service.BenefitPolicyCoverageService;
import com.waad.tba.modules.claim.dto.*;
import com.waad.tba.modules.claim.entity.Claim;
import com.waad.tba.modules.claim.entity.ClaimAttachment;
import com.waad.tba.modules.claim.entity.ClaimLine;
import com.waad.tba.modules.medicaltaxonomy.entity.MedicalService;
import com.waad.tba.modules.member.entity.Member;
import com.waad.tba.modules.preauthorization.entity.PreAuthorization;
import com.waad.tba.modules.provider.dto.EffectivePriceResponseDto;
import com.waad.tba.modules.provider.entity.Provider;
import com.waad.tba.modules.provider.service.ProviderContractService;
import com.waad.tba.modules.visit.entity.Visit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.hibernate.Hibernate;

@Slf4j
@Component
@RequiredArgsConstructor
@SuppressWarnings("deprecation")
public class ClaimMapper {

    private final ProviderContractService providerContractService;
    private final BenefitPolicyCoverageService benefitPolicyCoverageService;

    /**
     * PURE TRANSFORMATION (Refactored 2026-02-24)
     * Maps DTO to Entity using pre-resolved visit, provider, and pre-auth.
     */
    public Claim toEntity(ClaimCreateDto dto, Visit visit, Provider provider, PreAuthorization preAuth,
            Map<Long, MedicalService> medicalServiceMap) {
        log.info("📝 [CLAIM-MAPPER] Mapping Claim entity (Pure Transformation)");

        LocalDate serviceDate = visit.getVisitDate();
        if (serviceDate == null && dto.getServiceDate() != null) {
            serviceDate = dto.getServiceDate();
        }
        if (serviceDate == null) {
            serviceDate = LocalDate.now();
        }

        Claim claim = Claim.builder()
                .member(visit.getMember())
                .visit(visit)
                .providerId(visit.getProviderId())
                .providerName(provider.getName())
                .doctorName(dto.getDoctorName())
                .diagnosisCode(dto.getDiagnosisCode())
                .diagnosisDescription(dto.getDiagnosisDescription())
                .serviceDate(serviceDate)
                .preAuthorization(preAuth)
                .build();

        BigDecimal totalRequestedAmount = BigDecimal.ZERO;
        List<ClaimLine> lines = new ArrayList<>();
        Member member = visit.getMember();

        for (ClaimLineDto lineDto : dto.getLines()) {
            MedicalService medicalService = medicalServiceMap.get(lineDto.getMedicalServiceId());
            if (medicalService == null) {
                throw new IllegalArgumentException("MedicalService not found for ID: " + lineDto.getMedicalServiceId());
            }

            // Resolve contract price
            EffectivePriceResponseDto priceResponse = providerContractService.getEffectivePrice(
                    visit.getProviderId(), medicalService.getCode(), serviceDate);

            if (!priceResponse.isHasContract() || priceResponse.getContractPrice() == null) {
                throw new IllegalArgumentException("No contract price found for service " + medicalService.getCode());
            }

            // Get coverage info
            var coverageInfoOpt = benefitPolicyCoverageService.getCoverageForService(member, medicalService.getId());
            boolean requiresPA = coverageInfoOpt.map(c -> c.isRequiresPreApproval()).orElse(false);
            Integer coveragePercentSnapshot = coverageInfoOpt.map(c -> c.getCoveragePercent()).orElse(null);
            Integer patientCopayPercentSnapshot = coveragePercentSnapshot != null ? (100 - coveragePercentSnapshot)
                    : null;

            BigDecimal unitPrice = priceResponse.getContractPrice();
            Integer quantity = lineDto.getQuantity() != null ? lineDto.getQuantity() : 1;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));

            ClaimLine line = ClaimLine.builder()
                    .claim(claim)
                    .medicalService(medicalService)
                    .serviceCode(medicalService.getCode())
                    .serviceName(medicalService.getName())
                    .serviceCategoryId(lineDto.getServiceCategoryId()) // Category should be pre-validated by service
                    .serviceCategoryName(lineDto.getServiceCategoryName())
                    .requiresPA(requiresPA)
                    .coveragePercentSnapshot(coveragePercentSnapshot)
                    .patientCopayPercentSnapshot(patientCopayPercentSnapshot)
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build();

            lines.add(line);
            totalRequestedAmount = totalRequestedAmount.add(lineTotal);
        }

        claim.setLines(lines);
        claim.setRequestedAmount(totalRequestedAmount);

        return claim;
    }

    /**
     * Re-applies pricing and coverage to claim lines during draft edit.
     */
    public void replaceClaimLinesForDraft(Claim claim, List<ClaimLineDto> lineDtos,
            Map<Long, MedicalService> medicalServiceMap) {
        BigDecimal totalRequestedAmount = BigDecimal.ZERO;
        List<ClaimLine> newLines = new ArrayList<>();
        LocalDate serviceDate = claim.getServiceDate() != null ? claim.getServiceDate() : LocalDate.now();

        for (ClaimLineDto lineDto : lineDtos) {
            MedicalService medicalService = medicalServiceMap.get(lineDto.getMedicalServiceId());
            if (medicalService == null) {
                throw new IllegalArgumentException("MedicalService not found for ID: " + lineDto.getMedicalServiceId());
            }

            EffectivePriceResponseDto priceResponse = providerContractService.getEffectivePrice(
                    claim.getProviderId(), medicalService.getCode(), serviceDate);

            if (!priceResponse.isHasContract() || priceResponse.getContractPrice() == null) {
                throw new IllegalArgumentException("No contract price found for service " + medicalService.getCode());
            }

            var coverageInfoOpt = benefitPolicyCoverageService.getCoverageForService(claim.getMember(),
                    medicalService.getId());
            boolean requiresPA = coverageInfoOpt.map(c -> c.isRequiresPreApproval()).orElse(false);
            Integer coveragePercentSnapshot = coverageInfoOpt.map(c -> c.getCoveragePercent()).orElse(null);
            Integer patientCopayPercentSnapshot = coveragePercentSnapshot != null ? (100 - coveragePercentSnapshot)
                    : null;

            BigDecimal unitPrice = priceResponse.getContractPrice();
            Integer quantity = lineDto.getQuantity() != null ? lineDto.getQuantity() : 1;
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(quantity));

            ClaimLine line = ClaimLine.builder()
                    .claim(claim)
                    .medicalService(medicalService)
                    .serviceCode(medicalService.getCode())
                    .serviceName(medicalService.getName())
                    .serviceCategoryId(lineDto.getServiceCategoryId())
                    .serviceCategoryName(lineDto.getServiceCategoryName())
                    .requiresPA(requiresPA)
                    .coveragePercentSnapshot(coveragePercentSnapshot)
                    .patientCopayPercentSnapshot(patientCopayPercentSnapshot)
                    .quantity(quantity)
                    .unitPrice(unitPrice)
                    .totalPrice(lineTotal)
                    .build();

            newLines.add(line);
            totalRequestedAmount = totalRequestedAmount.add(lineTotal);
        }

        claim.getLines().clear();
        newLines.forEach(claim::addLine);
        claim.setRequestedAmount(totalRequestedAmount);
    }

    public void updateEntityFromDto(Claim claim, ClaimUpdateDto dto, PreAuthorization preAuth) {
        if (dto.getDoctorName() != null)
            claim.setDoctorName(dto.getDoctorName());
        if (dto.getStatus() != null)
            claim.setStatus(dto.getStatus());
        if (dto.getApprovedAmount() != null)
            claim.setApprovedAmount(dto.getApprovedAmount());
        if (dto.getReviewerComment() != null)
            claim.setReviewerComment(dto.getReviewerComment());
        if (dto.getActive() != null)
            claim.setActive(dto.getActive());
        if (dto.getDiagnosisCode() != null)
            claim.setDiagnosisCode(dto.getDiagnosisCode());
        if (dto.getDiagnosisDescription() != null)
            claim.setDiagnosisDescription(dto.getDiagnosisDescription());

        if (preAuth != null) {
            claim.setPreAuthorization(preAuth);
        }

        if (dto.getAttachments() != null) {
            claim.getAttachments().clear();
            dto.getAttachments().forEach(attDto -> {
                ClaimAttachment attachment = ClaimAttachment.builder()
                        .claim(claim)
                        .fileName(attDto.getFileName())
                        .fileUrl(attDto.getFileUrl())
                        .fileType(attDto.getFileType())
                        .build();
                claim.addAttachment(attachment);
            });
        }
    }

    public ClaimViewDto toViewDto(Claim claim) {
        return toViewDto(claim, null);
    }

    /**
     * PURE TRANSFORMATION: Maps Claim to View DTO.
     * Related data must be pre-loaded or passed as arguments.
     */
    public ClaimViewDto toViewDto(Claim claim, String settlementBatchNumber) {
        ClaimViewDto dto = ClaimViewDto.builder()
                .id(claim.getId())
                .claimNumber("CLM-" + claim.getId())
                .providerName(claim.getProviderName())
                .providerId(claim.getProviderId())
                .doctorName(claim.getDoctorName())
                .diagnosisCode(claim.getDiagnosisCode())
                .diagnosisDescription(claim.getDiagnosisDescription())
                .diagnosis(
                        claim.getDiagnosisCode() != null
                                ? claim.getDiagnosisCode() + " - "
                                        + (claim.getDiagnosisDescription() != null ? claim.getDiagnosisDescription()
                                                : "")
                                : null)
                .visitDate(claim.getServiceDate())
                .serviceDate(claim.getServiceDate())
                .requestedAmount(claim.getRequestedAmount())
                .totalAmount(claim.getRequestedAmount())
                .approvedAmount(claim.getApprovedAmount())
                .differenceAmount(claim.getDifferenceAmount())
                .status(claim.getStatus())
                .statusLabel(claim.getStatus() != null ? claim.getStatus().getArabicLabel() : null)
                .reviewerComment(claim.getReviewerComment())
                .reviewedAt(claim.getReviewedAt())
                .serviceCount(claim.getServiceCount())
                .attachmentsCount(claim.getAttachmentsCount())
                .active(claim.getActive())
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .createdBy(claim.getCreatedBy())
                .updatedBy(claim.getUpdatedBy())
                .patientCoPay(claim.getPatientCoPay())
                .netProviderAmount(claim.getNetProviderAmount())
                .coPayPercent(claim.getCoPayPercent())
                .deductibleApplied(claim.getDeductibleApplied())
                .paymentReference(claim.getPaymentReference())
                .settledAt(claim.getSettledAt())
                .settlementNotes(claim.getSettlementNotes())
                .settlementBatchId(claim.getSettlementBatchId())
                .settlementBatchNumber(settlementBatchNumber)
                .expectedCompletionDate(claim.getExpectedCompletionDate())
                .actualCompletionDate(claim.getActualCompletionDate())
                .withinSla(claim.getWithinSla())
                .businessDaysTaken(claim.getBusinessDaysTaken())
                .slaDaysConfigured(claim.getSlaDaysConfigured())
                .slaStatus(calculateSlaStatus(claim))
                .build();

        if (claim.getVisit() != null) {
            dto.setVisitId(claim.getVisit().getId());
            dto.setVisitDate(claim.getVisit().getVisitDate());
            dto.setVisitType(claim.getVisit().getVisitType() != null ? claim.getVisit().getVisitType().name() : null);
        }

        if (claim.getMember() != null) {
            dto.setMemberId(claim.getMember().getId());
            dto.setMemberFullName(claim.getMember().getFullName());
            dto.setMemberName(claim.getMember().getFullName());
            dto.setMemberNationalNumber(claim.getMember().getNationalNumber());

            if (claim.getMember().getEmployer() != null) {
                dto.setEmployerId(claim.getMember().getEmployer().getId());
                dto.setEmployerName(claim.getMember().getEmployer().getName());
                dto.setEmployerCode(claim.getMember().getEmployer().getCode());
            }

            if (claim.getMember().getBenefitPolicy() != null) {
                dto.setBenefitPackageId(claim.getMember().getBenefitPolicy().getId());
                dto.setBenefitPackageName(claim.getMember().getBenefitPolicy().getName());
                dto.setBenefitPackageCode(claim.getMember().getBenefitPolicy().getPolicyCode());
            }
        }

        if (claim.getPreAuthorization() != null) {
            dto.setPreApprovalId(claim.getPreAuthorization().getId());
            dto.setPreApprovalStatus(
                    claim.getPreAuthorization().getStatus() != null ? claim.getPreAuthorization().getStatus().name()
                            : null);
        }

        dto.setLines(claim.getLines() != null
                ? claim.getLines().stream().map(this::toLineDto).collect(Collectors.toList())
                : new ArrayList<>());

        dto.setAttachments(claim.getAttachments() != null
                ? claim.getAttachments().stream().map(this::toAttachmentDto).collect(Collectors.toList())
                : new ArrayList<>());

        return dto;
    }

    private ClaimLineDto toLineDto(ClaimLine line) {
        return ClaimLineDto.builder()
                .id(line.getId())
                .medicalServiceId(line.getMedicalService() != null ? line.getMedicalService().getId() : null)
                .serviceCode(line.getServiceCode())
                .serviceName(line.getServiceName())
                .serviceCategoryId(line.getServiceCategoryId())
                .serviceCategoryName(line.getServiceCategoryName())
                .requiresPA(line.getRequiresPA())
                .quantity(line.getQuantity())
                .unitPrice(line.getUnitPrice())
                .totalPrice(line.getTotalPrice())
                .build();
    }

    private ClaimAttachmentDto toAttachmentDto(ClaimAttachment attachment) {
        return ClaimAttachmentDto.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .fileUrl(attachment.getFileUrl())
                .fileType(attachment.getFileType())
                .createdAt(attachment.getCreatedAt())
                .build();
    }

    private String calculateSlaStatus(Claim claim) {
        if (claim.getExpectedCompletionDate() == null)
            return null;
        if (claim.getActualCompletionDate() != null) {
            return Boolean.TRUE.equals(claim.getWithinSla()) ? "MET" : "BREACHED";
        }
        LocalDate today = LocalDate.now();
        LocalDate expectedDate = claim.getExpectedCompletionDate();
        if (today.isAfter(expectedDate))
            return "BREACHED";
        if (today.plusDays(1).isAfter(expectedDate) || today.isEqual(expectedDate))
            return "AT_RISK";
        return "ON_TRACK";
    }
}

