package com.asatech.technicalchat.dto.response;

import java.time.Instant;

import com.asatech.technicalchat.model.MessageStatus;

public record MessageResponse(
        String id,
        String senderId,
        String recipientId,
        String content,
        Instant sentAt,
        MessageStatus status
) {
}
