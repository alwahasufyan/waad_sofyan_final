package com.waad.tba.modules.medicalpackage;

import com.waad.tba.modules.medicalpackage.dto.MedicalPackageSelectorDto;

public class MedicalPackageMapper {

    public static MedicalPackageSelectorDto toSelectorDto(MedicalPackage entity) {
        if (entity == null) return null;
        
        return MedicalPackageSelectorDto.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .build();
    }
}
