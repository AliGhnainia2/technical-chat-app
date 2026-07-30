package com.asatech.technicalchat.exception;

public record ValidationError(
        String field,
        String message
) {
}
