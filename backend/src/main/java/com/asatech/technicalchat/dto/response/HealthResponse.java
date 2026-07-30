package com.asatech.technicalchat.dto.response;

import java.time.Instant;

public record HealthResponse(
        String status,
        Instant timestamp
) {
}
