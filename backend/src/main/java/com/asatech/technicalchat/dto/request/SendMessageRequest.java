package com.asatech.technicalchat.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendMessageRequest(
        @NotBlank(message = "Recipient is required")
        String recipientId,

        @NotBlank(message = "Message content is required")
        @Size(max = 2000, message = "Message content must not exceed 2000 characters")
        String content
) {
}
