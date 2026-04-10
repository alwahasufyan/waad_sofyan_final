package com.waad.tba.security;

import com.waad.tba.common.exception.UnauthorizedException;
import com.waad.tba.modules.rbac.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.SignatureException;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

/**
 * JWT Token Provider — Static Role-Based Authorization (Phase 5)
 *
 * Generates JWT tokens with role from user.userType.
 * No dynamic permissions are included in the token.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    @Value("${jwt.secret:ThisIsAVeryLongSecretKeyForJWTTokenGenerationWithAtLeast256BitsLength12345678}")
    private String jwtSecret;

    @Value("${jwt.expiration:86400000}")
    private long jwtExpiration;

    private SecretKey key;

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generate JWT token for user.
     * Token includes role from userType, no dynamic permissions.
     */
    public String generateToken(User user) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);

        String role = user.getUserType() != null ? user.getUserType() : "DATA_ENTRY";
        boolean isSuperAdmin = "SUPER_ADMIN".equals(role);

        return Jwts.builder()
                .subject(user.getUsername())
                .claim("userId", user.getId())
                .claim("fullName", user.getFullName())
                .claim("email", user.getEmail())
                .claim("roles", List.of(role))
                .claim("role", role)
                .claim("employerId", user.getEmployerId())
                .claim("providerId", user.getProviderId())
                .claim("isSuperAdmin", isSuperAdmin)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(key)
                .compact();
    }

    public String getUsernameFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        parseClaims(token);
        return true;
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (ExpiredJwtException | MalformedJwtException | SignatureException | UnsupportedJwtException ex) {
            log.warn("Rejected JWT token: {}", ex.getClass().getSimpleName());
            throw new UnauthorizedException("Invalid or expired token");
        } catch (IllegalArgumentException ex) {
            log.warn("Rejected JWT token: empty or invalid token payload");
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
