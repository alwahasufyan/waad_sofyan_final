package com.waad.tba.common.error;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import com.waad.tba.common.exception.UnauthorizedException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleUnauthorizedReturns401WithInvalidTokenPayload() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/auth/me");

        ResponseEntity<ApiError> response = handler.handleUnauthorized(
                new UnauthorizedException("Invalid or expired token"),
                request);
        ApiError body = response.getBody();

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(body);
        assertFalse(body.isSuccess());
        assertEquals(ErrorCode.INVALID_TOKEN.name(), body.getErrorCode());
        assertEquals("Invalid or expired token", body.getMessage());
        assertEquals("/api/v1/auth/me", body.getPath());
    }
}