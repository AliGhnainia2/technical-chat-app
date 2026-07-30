package com.asatech.technicalchat.dto.response;

import java.time.Instant;

import com.asatech.technicalchat.model.UserStatus;

public record PresenceResponse(
        String userId,
        UserStatus status,
        Instant lastSeenAt
) {
}
