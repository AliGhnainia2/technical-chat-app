package com.asatech.technicalchat.security;

import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import com.asatech.technicalchat.config.JwtProperties;
import com.asatech.technicalchat.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final String EMAIL_CLAIM = "email";
    private static final String USERNAME_CLAIM = "username";

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(JwtProperties properties) {
        this.signingKey = createSigningKey(properties.secret());
        this.expirationMs = properties.expirationMs();
    }

    public String generateToken(User user) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plusMillis(expirationMs);

        return Jwts.builder()
                .subject(user.getId())
                .claim(EMAIL_CLAIM, user.getEmail())
                .claim(USERNAME_CLAIM, user.getUsername())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();
    }

    public SecurityUser parseToken(String token) {
        Claims claims = extractClaims(token);
        String subject = claims.getSubject();
        String email = claims.get(EMAIL_CLAIM, String.class);
        String username = claims.get(USERNAME_CLAIM, String.class);

        if (subject == null || subject.isBlank() || email == null || email.isBlank()) {
            throw new JwtException("JWT subject and email claim are required");
        }

        return new SecurityUser(subject, email, "", username);
    }

    public String extractSubject(String token) {
        return extractClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            String subject = extractSubject(token);
            return subject != null && !subject.isBlank();
        } catch (JwtException | IllegalArgumentException exception) {
            return false;
        }
    }

    public long getExpirationSeconds() {
        return expirationMs / 1000;
    }

    private Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private SecretKey createSigningKey(String secret) {
        try {
            return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        } catch (DecodingException | WeakKeyException exception) {
            throw new IllegalStateException(
                    "JWT_SECRET must be a Base64-encoded key containing at least 256 bits",
                    exception
            );
        }
    }
}
