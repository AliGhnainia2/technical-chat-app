package com.asatech.technicalchat.dto.response;

import java.time.Instant;

public record WebSocketErrorResponse(
        Instant timestamp,
        String message
) {
}
