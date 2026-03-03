package com.waad.tba.modules.member.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

import com.waad.tba.modules.member.entity.Member;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "DTO for creating a new member")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@SuppressWarnings("deprecation")
public class MemberCreateDto {

    // Personal Information
    @Schema(description = "Full name", example = "أحمد محمد علي", required = true)
    @NotBlank(message = "Full name is required")
    private String fullName;

    @Schema(description = "National Number (الرقم الوطني) - OPTIONAL", example = "289123456789")
    private String nationalNumber;

    @Schema(description = "Card Number (رقم بطاقة العضو) - OPTIONAL, user can input manually", example = "CARD-12345")
    private String cardNumber;

    @Schema(description = "Birth date - OPTIONAL", example = "1990-01-15")
    private LocalDate birthDate;

    @Schema(description = "Gender - OPTIONAL, defaults to UNDEFINED", example = "MALE")
    private Member.Gender gender;

    @Schema(description = "Marital status", example = "MARRIED")
    private Member.MaritalStatus maritalStatus;

    @Schema(description = "Phone number", example = "+96512345678")
    private String phone;

    @Schema(description = "Email address", example = "ahmed@example.com")
    @Email(message = "Invalid email format")
    private String email;

    @Schema(description = "Address", example = "طرابلس، شارع الجمهورية، عمارة 15")
    private String address;

    @Schema(description = "Nationality", example = "Libyan")
    private String nationality;

    // Insurance Information
    @Schema(description = "Policy number", example = "POL-2024-001")
    private String policyNumber;

    @Schema(description = "Benefit Policy ID", example = "1")
    private Long benefitPolicyId;

    // Employment Information
    @Schema(description = "Employer ID", example = "1", required = true)
    @NotNull(message = "Employer is required")
    @JsonAlias({"employerId", "employer_organization_id", "organizationId", "employer_id"})
    private Long employerId;

    @Schema(description = "Employee number", example = "EMP-001")
    private String employeeNumber;

    @Schema(description = "Join date", example = "2024-01-01")
    private LocalDate joinDate;

    @Schema(description = "Occupation", example = "Software Engineer")
    private String occupation;

    // Membership Status
    @Schema(description = "Member status", example = "ACTIVE")
    private Member.MemberStatus status;

    @Schema(description = "Start date", example = "2024-01-01")
    private LocalDate startDate;

    @Schema(description = "End date", example = "2025-01-01")
    private LocalDate endDate;

    @Schema(description = "Card status", example = "ACTIVE")
    private Member.CardStatus cardStatus;

    @Schema(description = "Notes", example = "VIP member")
    private String notes;

    @Schema(description = "Active flag", example = "true")
    private Boolean active;

    // ==================== UNIFIED MEMBER ARCHITECTURE ====================
    
    /**
     * Parent Member ID - ONLY for creating DEPENDENT members.
     * 
     * NULL or not provided: Creates a PRINCIPAL member (head of family)
     * NOT NULL: Creates a DEPENDENT member under the specified principal
     * 
     * When creating a dependent:
     * - relationship field is REQUIRED
     * - barcode will be NULL (inherited from parent)
     * - cardNumber will be auto-generated as {parent_card}-{sequence}
     */
    @Schema(description = "Parent Member ID - for creating dependents only", example = "123")
    private Long parentId;

    /**
     * Relationship Type - REQUIRED when parentId is provided.
     * NULL when creating a principal member.
     * 
     * Valid values: WIFE, HUSBAND, SON, DAUGHTER, FATHER, MOTHER, BROTHER, SISTER
     */
    @Schema(description = "Relationship type - required for dependents", example = "SON")
    private Member.Relationship relationship;

    /**
     * List of dependents to create along with the principal member.
     * 
     * ONLY used when creating a PRINCIPAL member (parentId = null).
     * Each dependent will be created with:
     * - parent_id = newly created principal's id
     * - barcode = NULL
     * - cardNumber = principal's cardNumber + suffix
     * - relationship = from dependent DTO
     * 
     * DEPRECATED: Use this for bulk creation during initial setup.
     * For adding dependents later, use POST /api/members (with parentId set).
     */
    @Schema(description = "List of dependents (for bulk creation with principal)")
    @Valid
    @Deprecated
    private List<DependentMemberDto> dependents;

    // Flexible Attributes
    @Schema(description = "List of custom attributes (key-value pairs)")
    @Valid
    private List<MemberAttributeDto> attributes;
}


