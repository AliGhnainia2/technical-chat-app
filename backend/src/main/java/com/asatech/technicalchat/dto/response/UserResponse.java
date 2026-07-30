package com.asatech.technicalchat.dto.response;

import java.time.Instant;

import com.asatech.technicalchat.model.UserStatus;

public record UserResponse(
        String id,
        String username,
        String email,
        UserStatus status,
        Instant lastSeenAt,
        Instant createdAt
) {
}

