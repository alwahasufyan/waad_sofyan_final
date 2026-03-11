package com.waad.tba.modules.settlement.dto;

import java.util.List;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateBatchRequest {
    private Long providerId;
    private String description;
    private List<Long> claimIds;
    private Long createdBy;
}
