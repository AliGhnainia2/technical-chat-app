package com.asatech.technicalchat.dto.response;

public record AuthenticationResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserResponse user
) {
}

