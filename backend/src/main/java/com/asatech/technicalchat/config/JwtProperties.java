package com.asatech.technicalchat.config;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "application.security.jwt")
public record JwtProperties(
        @NotBlank(message = "JWT_SECRET must be configured")
        String secret,

        @Positive(message = "JWT_EXPIRATION_MS must be greater than zero")
        long expirationMs
) {
}

