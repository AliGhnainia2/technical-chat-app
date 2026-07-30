package com.asatech.technicalchat.websocket;

import java.security.Principal;
import java.time.Instant;

import com.asatech.technicalchat.dto.request.SendMessageRequest;
import com.asatech.technicalchat.dto.response.WebSocketErrorResponse;
import com.asatech.technicalchat.exception.BusinessException;
import com.asatech.technicalchat.exception.RequestValidationException;
import com.asatech.technicalchat.exception.ResourceNotFoundException;
import com.asatech.technicalchat.security.SecurityUser;
import com.asatech.technicalchat.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(
            @Valid SendMessageRequest request,
            Principal principal
    ) {
        messageService.sendMessage(extractUserId(principal), request);
    }

    @MessageExceptionHandler({
            BusinessException.class,
            RequestValidationException.class,
            ResourceNotFoundException.class
    })
    @SendToUser(value = "/queue/errors", broadcast = false)
    public WebSocketErrorResponse handleBusinessError(RuntimeException exception) {
        return new WebSocketErrorResponse(Instant.now(), exception.getMessage());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(value = "/queue/errors", broadcast = false)
    public WebSocketErrorResponse handleUnexpectedError() {
        return new WebSocketErrorResponse(
                Instant.now(),
                "Message could not be processed"
        );
    }

    private String extractUserId(Principal principal) {
        if (principal instanceof Authentication authentication
                && authentication.getPrincipal() instanceof SecurityUser securityUser) {
            return securityUser.id();
        }
        throw new BusinessException("WebSocket authentication is required");
    }
}
