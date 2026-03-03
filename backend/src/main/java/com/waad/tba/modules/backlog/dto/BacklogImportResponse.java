package com.waad.tba.modules.backlog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BacklogImportResponse {
    private int totalProcessed;
    private int successCount;
    private int failureCount;
    private List<ImportError> errors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportError {
        private Integer rowNumber;
        private String errorMessage;
    }
}
