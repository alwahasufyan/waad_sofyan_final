package com.waad.tba.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Objects;

import javax.crypto.SecretKey;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.waad.tba.common.exception.UnauthorizedException;
import com.waad.tba.modules.rbac.entity.User;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

class JwtTokenProviderTest {

    private static final String JWT_SECRET = "ThisIsAVeryLongSecretKeyForJWTTokenGenerationWithAtLeast256BitsLength12345678";

    private JwtTokenProvider jwtTokenProvider;
    private SecretKey signingKey;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", JWT_SECRET);
        ReflectionTestUtils.setField(Objects.requireNonNull(jwtTokenProvider), "jwtExpiration", 86_400_000L);
        jwtTokenProvider.init();
        signingKey = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void getUsernameFromTokenReturnsSubjectForValidToken() {
        User user = User.builder()
                .id(7L)
                .username("superadmin@tba.sa")
                .fullName("System Admin")
                .email("superadmin@tba.sa")
                .userType("SUPER_ADMIN")
                .build();

        String token = jwtTokenProvider.generateToken(user);

        assertEquals("superadmin@tba.sa", jwtTokenProvider.getUsernameFromToken(token));
        assertTrue(jwtTokenProvider.validateToken(token));
    }

    @Test
    void validateTokenThrowsUnauthorizedExceptionForMalformedToken() {
        UnauthorizedException exception = assertThrows(
                UnauthorizedException.class,
                () -> jwtTokenProvider.validateToken("not-a-jwt-token"));

        assertEquals("Invalid or expired token", exception.getMessage());
    }

    @Test
    void getUsernameFromTokenThrowsUnauthorizedExceptionForExpiredToken() {
        String expiredToken = Jwts.builder()
                .subject("superadmin@tba.sa")
                .issuedAt(new Date(System.currentTimeMillis() - 10_000))
                .expiration(new Date(System.currentTimeMillis() - 5_000))
                .signWith(signingKey)
                .compact();

        UnauthorizedException exception = assertThrows(
                UnauthorizedException.class,
                () -> jwtTokenProvider.getUsernameFromToken(expiredToken));

        assertEquals("Invalid or expired token", exception.getMessage());
    }
}