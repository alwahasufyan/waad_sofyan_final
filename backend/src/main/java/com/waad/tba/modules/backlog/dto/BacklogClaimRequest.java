package com.waad.tba.modules.backlog.dto;

import com.waad.tba.common.enums.NetworkType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacklogClaimRequest {
    private Long memberId;
    private Long providerId;
    private LocalDate serviceDate;
    private String doctorName;
    private String diagnosis;
    private String legacyReferenceNumber;
    private String notes;
    private NetworkType networkStatus;
    private List<BacklogServiceLineDto> lines;
}
