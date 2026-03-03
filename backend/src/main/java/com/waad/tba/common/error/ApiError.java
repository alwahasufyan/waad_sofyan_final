package com.waad.tba.common.error;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Schema(description = "Unified error response schema for all API error results")
@Getter
@ToString
@Builder
public class ApiError {
    @Schema(description = "Always false for errors", example = "false")
    private final boolean success;

    @Schema(description = "Standard error code identifying the failure type", example = "USER_NOT_FOUND")
    private final String errorCode;

    @Schema(description = "Human readable error message", example = "The requested user does not exist")
    private final String message;

    @Schema(description = "Arabic error message (for bilingual support)", example = "المستخدم المطلوب غير موجود")
    @Setter
    private String messageAr;

    @Schema(description = "Unique tracking ID for this error (UUID)", example = "550e8400-e29b-41d4-a716-446655440000")
    private final String trackingId;

    @Schema(description = "Timestamp in ISO-8601 UTC format", example = "2025-01-01T10:00:00Z")
    private final String timestamp;

    @Schema(description = "Request path that generated the error", example = "/api/admin/users/55")
    private final String path;

    @Schema(description = "Optional additional details (validation errors, context, etc.)")
    private final Object details;

    public static ApiError of(ErrorCode code, String message, String path, Object details, String timestamp, String trackingId) {
        return ApiError.builder()
                .success(false)
                .errorCode(code.name())
                .message(message)
                .trackingId(trackingId)
                .timestamp(timestamp)
                .path(path)
                .details(details)
                .build();
    }
}
