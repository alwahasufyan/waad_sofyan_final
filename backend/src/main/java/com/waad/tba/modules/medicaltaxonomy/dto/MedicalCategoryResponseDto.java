package com.waad.tba.modules.medicaltaxonomy.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Medical Category responses.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MedicalCategoryResponseDto {

    private Long id;
    private String code;
    private String name;
    private Long parentId;
    private String parentName; // For UX - display parent category name
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // For tree/hierarchy responses
    private List<MedicalCategoryResponseDto> children;
}
