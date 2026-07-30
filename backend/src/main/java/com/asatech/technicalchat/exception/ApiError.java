package com.asatech.technicalchat.exception;

import java.time.Instant;
import java.util.List;

public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<ValidationError> validationErrors
) {
    public ApiError {
        validationErrors = validationErrors == null ? List.of() : List.copyOf(validationErrors);
    }
}
